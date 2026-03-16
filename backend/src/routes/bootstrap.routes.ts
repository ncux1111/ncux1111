import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getBootstrapState } from '../services/state.service.js';

export const bootstrapRouter = Router();

bootstrapRouter.get('/bootstrap', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const payload = await getBootstrapState({
      userId: request.auth!.userId,
      role: request.auth!.role,
    });

    response.json(payload);
  } catch (error) {
    next(error);
  }
});
