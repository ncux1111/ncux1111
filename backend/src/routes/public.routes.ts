import { Router } from 'express';
import { HttpError } from '../lib/http-error.js';
import { appendLead, appendVisitorEvent, getPublicWebsiteContent } from '../services/state.service.js';

export const publicRouter = Router();

publicRouter.get('/public/website-content', async (_request, response, next) => {
  try {
    const payload = await getPublicWebsiteContent();
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

publicRouter.post('/public/leads', async (request, response, next) => {
  try {
    const payload = request.body || {};
    if (!payload.id || !payload.source) {
      throw new HttpError(400, 'Lead payload is invalid');
    }
    await appendLead(payload);
    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

publicRouter.post('/public/visitor-events', async (request, response, next) => {
  try {
    const payload = request.body || {};
    if (!payload.id || !payload.type) {
      throw new HttpError(400, 'Visitor event payload is invalid');
    }
    await appendVisitorEvent(payload);
    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});
