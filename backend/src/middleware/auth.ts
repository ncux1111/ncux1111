import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { verifyAccessToken } from '../lib/tokens.js';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    login: string;
    role: UserRole;
  };
}

function readAccessToken(request: Request) {
  return request.cookies?.zanqdm_access_token || null;
}

export async function requireAuth(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  try {
    const token = readAccessToken(request);
    if (!token) {
      throw new HttpError(401, 'Authentication required');
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.blocked) {
      throw new HttpError(401, 'Session is not valid');
    }

    request.auth = {
      userId: user.id,
      login: user.login,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  if (!request.auth || request.auth.role !== UserRole.ADMIN) {
    next(new HttpError(403, 'Admin access required'));
    return;
  }

  next();
}
