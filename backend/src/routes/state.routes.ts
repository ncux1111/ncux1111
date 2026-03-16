import { Router } from 'express';
import { requireAdmin, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  saveAppState,
  saveDirectoryState,
  saveOperationsState,
  saveTemplateState,
  saveWebsiteState,
} from '../services/state.service.js';

export const stateRouter = Router();

stateRouter.put('/state/directory', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    await saveDirectoryState(request.body, { userId: request.auth!.userId, role: request.auth!.role });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

stateRouter.put('/state/app', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    await saveAppState(request.body);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

stateRouter.put('/state/templates', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    await saveTemplateState(request.body, { userId: request.auth!.userId, role: request.auth!.role });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

stateRouter.put('/state/operations', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    await saveOperationsState(request.body, { userId: request.auth!.userId, role: request.auth!.role });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

stateRouter.put('/state/website', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    await saveWebsiteState(request.body);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
