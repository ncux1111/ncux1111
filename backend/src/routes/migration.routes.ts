import { PasswordAlgorithm, UserRole } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { requireAdmin, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  saveAppState,
  saveDirectoryState,
  saveOperationsState,
  saveTemplateState,
  saveWebsiteState,
} from '../services/state.service.js';

export const migrationRouter = Router();

migrationRouter.post(
  '/migration/import-local',
  requireAuth,
  requireAdmin,
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const payload = request.body || {};

      if (payload.directory) {
        await saveDirectoryState(payload.directory, {
          userId: request.auth!.userId,
          role: request.auth!.role,
        });
      }
      if (payload.app) {
        await saveAppState(payload.app);
      }
      if (payload.websiteContent) {
        await saveWebsiteState(payload.websiteContent);
      }
      if (payload.templates) {
        await saveTemplateState(payload.templates, {
          userId: request.auth!.userId,
          role: request.auth!.role,
        });
      }
      if (payload.operations) {
        await saveOperationsState(payload.operations, {
          userId: request.auth!.userId,
          role: request.auth!.role,
        });
      }

      const users = Array.isArray(payload.users) ? payload.users : [];
      for (const user of users as Array<Record<string, unknown>>) {
        if (!user?.id || !user?.login || !user?.name || !user?.role) continue;
        await prisma.user.upsert({
          where: { id: String(user.id) },
          update: {
            name: String(user.name),
            login: String(user.login),
            role: user.role === 'admin' ? UserRole.ADMIN : UserRole.EMPLOYEE,
            passwordHash: String(user.passwordHash || user.password || ''),
            passwordSalt: user.passwordSalt ? String(user.passwordSalt) : null,
            passwordAlgorithm: user.passwordHash
              ? PasswordAlgorithm.ZANQDM_SHA256_V1
              : user.password
                ? PasswordAlgorithm.PLAINTEXT_LEGACY
                : PasswordAlgorithm.BCRYPT,
            mustChangePassword: false,
          },
          create: {
            id: String(user.id),
            name: String(user.name),
            login: String(user.login),
            role: user.role === 'admin' ? UserRole.ADMIN : UserRole.EMPLOYEE,
            passwordHash: String(user.passwordHash || user.password || ''),
            passwordSalt: user.passwordSalt ? String(user.passwordSalt) : null,
            passwordAlgorithm: user.passwordHash
              ? PasswordAlgorithm.ZANQDM_SHA256_V1
              : user.password
                ? PasswordAlgorithm.PLAINTEXT_LEGACY
                : PasswordAlgorithm.BCRYPT,
            mustChangePassword: false,
          },
        });
      }

      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);
