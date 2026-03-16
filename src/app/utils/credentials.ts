export interface PasswordCredential {
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
}

const HASH_PREFIX = 'zanqdm-sha256-v1';

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function createFallbackHash(value: string) {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + index;
    hashB = Math.imul(hashB, 0x27d4eb2d);
  }

  const nextA = (hashA >>> 0).toString(16).padStart(8, '0');
  const nextB = (hashB >>> 0).toString(16).padStart(8, '0');
  return `${HASH_PREFIX}:fallback:${nextA}${nextB}`;
}

async function hashPassword(password: string, salt: string) {
  const input = `${HASH_PREFIX}:${salt}:${password}`;

  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return `${HASH_PREFIX}:${toHex(digest)}`;
  }

  return createFallbackHash(input);
}

export function createPasswordSalt() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
}

export async function createPasswordSecret(password: string) {
  const passwordSalt = createPasswordSalt();
  const passwordHash = await hashPassword(password, passwordSalt);

  return { passwordHash, passwordSalt };
}

export async function resolvePasswordUpdate(
  record: PasswordCredential,
  nextPassword?: string
) {
  const normalizedPassword = nextPassword?.trim();

  if (!normalizedPassword) {
    return {
      password: hasSecurePassword(record) ? undefined : record.password,
      passwordHash: record.passwordHash,
      passwordSalt: record.passwordSalt,
    };
  }

  const { passwordHash, passwordSalt } = await createPasswordSecret(normalizedPassword);

  return {
    password: undefined,
    passwordHash,
    passwordSalt,
  };
}

export function hasSecurePassword(record: PasswordCredential) {
  return Boolean(record.passwordHash && record.passwordSalt);
}

export function needsPasswordMigration(record: PasswordCredential) {
  return Boolean(record.password && !hasSecurePassword(record));
}

export async function verifyPassword(
  record: PasswordCredential,
  candidatePassword: string
) {
  if (hasSecurePassword(record)) {
    const nextHash = await hashPassword(candidatePassword, record.passwordSalt!);
    return nextHash === record.passwordHash;
  }

  return typeof record.password === 'string' && record.password === candidatePassword;
}

export async function migrateLegacyPassword<T extends PasswordCredential>(record: T): Promise<T> {
  if (!needsPasswordMigration(record)) {
    return record;
  }

  const nextPassword = record.password?.trim() || '1234';
  const { passwordHash, passwordSalt } = await createPasswordSecret(nextPassword);
  const nextRecord = { ...record, passwordHash, passwordSalt } as T & PasswordCredential;
  delete nextRecord.password;
  return nextRecord as T;
}
