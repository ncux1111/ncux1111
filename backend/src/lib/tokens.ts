import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface SessionPayload {
  sub: string;
  role: 'admin' | 'employee';
  login: string;
}

const accessTokenExpiresIn = env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'];
const refreshTokenExpiresIn = `${env.REFRESH_TOKEN_TTL_DAYS}d` as jwt.SignOptions['expiresIn'];

export function signAccessToken(payload: SessionPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: accessTokenExpiresIn });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as SessionPayload;
}

export function signRefreshToken(payload: SessionPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: refreshTokenExpiresIn,
  });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as SessionPayload;
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
