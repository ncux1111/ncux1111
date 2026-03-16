import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export async function ensureUploadRoot() {
  await fs.mkdir(env.uploadRoot, { recursive: true });
}

export async function saveUploadedAsset(params: {
  scope: string;
  storageId: string;
  buffer: Buffer;
  extension: string;
}) {
  await ensureUploadRoot();
  const dir = path.join(env.uploadRoot, params.scope);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${params.storageId}${params.extension}`);
  await fs.writeFile(filePath, params.buffer);
  return filePath;
}

export async function deleteUploadedAsset(filePath: string) {
  await fs.rm(filePath, { force: true });
}
