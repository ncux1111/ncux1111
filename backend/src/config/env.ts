import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

const DEV_CORS_ORIGIN = 'http://localhost:5173';
const DEV_ACCESS_SECRET = 'change-me-access-secret';
const DEV_REFRESH_SECRET = 'change-me-refresh-secret';

config();
if (process.env.ENV_FILE?.trim()) {
  config({ path: process.env.ENV_FILE.trim(), override: true });
} else if (process.env.NODE_ENV === 'production') {
  config({ path: '.env.production', override: true });
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  UPLOAD_ROOT: z.string().optional(),
  TRUST_PROXY: z.coerce.number().default(1),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z.coerce.boolean().optional(),
});

const parsed = schema.parse(process.env);
const corsOrigin = parsed.CORS_ORIGIN?.trim() || (parsed.NODE_ENV === 'development' ? DEV_CORS_ORIGIN : '');
const jwtAccessSecret =
  parsed.JWT_ACCESS_SECRET?.trim() || (parsed.NODE_ENV === 'development' ? DEV_ACCESS_SECRET : '');
const jwtRefreshSecret =
  parsed.JWT_REFRESH_SECRET?.trim() || (parsed.NODE_ENV === 'development' ? DEV_REFRESH_SECRET : '');

if (!corsOrigin) {
  throw new Error('CORS_ORIGIN must be set explicitly outside development.');
}

if (!jwtAccessSecret || !jwtRefreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set explicitly outside development.');
}

if (parsed.NODE_ENV === 'production') {
  if (jwtAccessSecret === DEV_ACCESS_SECRET || jwtRefreshSecret === DEV_REFRESH_SECRET) {
    throw new Error('Production cannot start with default JWT secrets. Set secure values in the environment.');
  }
}

export const env = {
  ...parsed,
  CORS_ORIGIN: corsOrigin,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  isProduction: parsed.NODE_ENV === 'production',
  trustProxy: parsed.TRUST_PROXY,
  cookieDomain: parsed.COOKIE_DOMAIN?.trim() || undefined,
  cookieSameSite: parsed.COOKIE_SAME_SITE,
  cookieSecure: parsed.COOKIE_SECURE ?? parsed.NODE_ENV === 'production',
  uploadRoot: parsed.UPLOAD_ROOT
    ? path.resolve(parsed.UPLOAD_ROOT)
    : path.resolve(process.cwd(), 'uploads'),
};
