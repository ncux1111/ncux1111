import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PasswordAlgorithm } from '@prisma/client';

const HASH_PREFIX = 'zanqdm-sha256-v1';

function legacySha256Hash(password: string, salt: string) {
  return crypto
    .createHash('sha256')
    .update(`${HASH_PREFIX}:${salt}:${password}`)
    .digest('hex');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(params: {
  candidate: string;
  passwordHash: string;
  passwordSalt: string | null;
  algorithm: PasswordAlgorithm;
}) {
  const { candidate, passwordHash, passwordSalt, algorithm } = params;

  if (algorithm === PasswordAlgorithm.BCRYPT) {
    return bcrypt.compare(candidate, passwordHash);
  }

  if (algorithm === PasswordAlgorithm.ZANQDM_SHA256_V1 && passwordSalt) {
    return `${HASH_PREFIX}:${legacySha256Hash(candidate, passwordSalt)}` === passwordHash;
  }

  if (algorithm === PasswordAlgorithm.PLAINTEXT_LEGACY) {
    return candidate === passwordHash;
  }

  return false;
}
