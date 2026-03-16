import { PasswordAlgorithm, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/tokens.js';

function toRole(role: 'admin' | 'employee') {
  return role === 'admin' ? UserRole.ADMIN : UserRole.EMPLOYEE;
}

function currentUserDto(user: {
  id: string;
  name: string;
  role: UserRole;
  login: string;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    role: user.role === UserRole.ADMIN ? 'admin' : 'employee',
    login: user.login,
    mustChangePassword: user.mustChangePassword,
  } as const;
}

export async function loginUser(params: {
  login: string;
  password: string;
  role: 'admin' | 'employee';
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const user = await prisma.user.findUnique({ where: { login: params.login.trim().toLowerCase() } });
  if (!user || user.role !== toRole(params.role)) {
    throw new HttpError(401, 'Invalid credentials');
  }
  if (user.blocked) {
    throw new HttpError(403, 'User is blocked');
  }

  const valid = await verifyPassword({
    candidate: params.password.trim(),
    passwordHash: user.passwordHash,
    passwordSalt: user.passwordSalt,
    algorithm: user.passwordAlgorithm,
  });

  if (!valid) {
    throw new HttpError(401, 'Invalid credentials');
  }

  if (user.passwordAlgorithm !== PasswordAlgorithm.BCRYPT) {
    const upgradedHash = await hashPassword(params.password.trim());
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: upgradedHash,
        passwordSalt: null,
        passwordAlgorithm: PasswordAlgorithm.BCRYPT,
      },
    });
  }

  const accessToken = signAccessToken({
    sub: user.id,
    role: currentUserDto(user).role,
    login: user.login,
  });
  const refreshToken = signRefreshToken({
    sub: user.id,
    role: currentUserDto(user).role,
    login: user.login,
  });
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastClientId: params.clientId || null,
      },
    }),
    prisma.loginHistory.create({
      data: {
        userId: user.id,
        role: user.role,
        action: 'LOGIN',
        clientId: params.clientId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'auth.login',
        payload: { clientId: params.clientId || null },
      },
    }),
  ]);

  const nextUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  return { accessToken, refreshToken, user: currentUserDto(nextUser) };
}

export async function logoutUser(params: {
  userId?: string;
  refreshToken?: string | null;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.$transaction(async (tx) => {
    if (params.refreshToken) {
      await tx.refreshToken.updateMany({
        where: { tokenHash: hashToken(params.refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (!params.userId) {
      return;
    }

    const user = await tx.user.findUnique({ where: { id: params.userId } });
    if (!user) {
      return;
    }

    await tx.user.update({
      where: { id: user.id },
      data: { lastLogoutAt: new Date(), lastClientId: params.clientId || null },
    });
    await tx.loginHistory.create({
      data: {
        userId: user.id,
        role: user.role,
        action: 'LOGOUT',
        clientId: params.clientId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  });
}

export async function refreshSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const record = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      userId: payload.sub,
    },
    include: { user: true },
  });

  if (!record || record.user.blocked) {
    throw new HttpError(401, 'Refresh token is not valid');
  }

  const accessToken = signAccessToken({
    sub: record.user.id,
    role: record.user.role === UserRole.ADMIN ? 'admin' : 'employee',
    login: record.user.login,
  });

  return { accessToken, user: currentUserDto(record.user) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.blocked) {
    throw new HttpError(401, 'Session is not valid');
  }
  return currentUserDto(user);
}

export async function changePassword(params: { userId: string; currentPassword: string; newPassword: string }) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const valid = await verifyPassword({
    candidate: params.currentPassword.trim(),
    passwordHash: user.passwordHash,
    passwordSalt: user.passwordSalt,
    algorithm: user.passwordAlgorithm,
  });

  if (!valid) {
    throw new HttpError(400, 'Current password is incorrect');
  }

  const nextHash = await hashPassword(params.newPassword.trim());
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: nextHash,
      passwordSalt: null,
      passwordAlgorithm: PasswordAlgorithm.BCRYPT,
      mustChangePassword: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: 'auth.change-password',
    },
  });

  return currentUserDto(updated);
}
