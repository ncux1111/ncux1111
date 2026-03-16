import { Router } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { changePassword, getMe, loginUser, logoutUser, refreshSession } from '../services/auth.service.js';

const ACCESS_COOKIE = 'zanqdm_access_token';
const REFRESH_COOKIE = 'zanqdm_refresh_token';

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    domain: env.cookieDomain,
    path: '/',
    maxAge,
  };
}

export const authRouter = Router();

authRouter.post('/auth/login', async (request, response, next) => {
  try {
    const { login, password, role, clientId } = request.body || {};
    if (!login || !password || (role !== 'admin' && role !== 'employee')) {
      throw new HttpError(400, 'Login payload is invalid');
    }

    const result = await loginUser({
      login,
      password,
      role,
      clientId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    response
      .cookie(ACCESS_COOKIE, result.accessToken, cookieOptions(15 * 60 * 1000))
      .cookie(
        REFRESH_COOKIE,
        result.refreshToken,
        cookieOptions(env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
      )
      .json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/logout', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    await logoutUser({
      userId: request.auth?.userId,
      refreshToken: request.cookies?.[REFRESH_COOKIE] || null,
      clientId: request.body?.clientId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    response
      .clearCookie(ACCESS_COOKIE, cookieOptions())
      .clearCookie(REFRESH_COOKIE, cookieOptions())
      .status(204)
      .send();
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/refresh', async (request, response, next) => {
  try {
    const refreshToken = request.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new HttpError(401, 'Refresh token is required');
    }

    const result = await refreshSession(refreshToken);
    response.cookie(ACCESS_COOKIE, result.accessToken, cookieOptions(15 * 60 * 1000)).json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/auth/me', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await getMe(request.auth!.userId);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/change-password', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const { currentPassword, newPassword } = request.body || {};
    if (!currentPassword || !newPassword || String(newPassword).trim().length < 4) {
      throw new HttpError(400, 'Password payload is invalid');
    }

    const user = await changePassword({ userId: request.auth!.userId, currentPassword, newPassword });
    response.json({ user });
  } catch (error) {
    next(error);
  }
});
