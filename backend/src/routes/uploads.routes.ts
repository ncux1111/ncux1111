import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { AssetScope } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { deleteUploadedAsset, saveUploadedAsset } from '../lib/storage.js';
import { requireAuth } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function normalizeScope(scope: string): AssetScope {
  if (scope === 'template') return AssetScope.TEMPLATE;
  if (scope === 'review-file') return AssetScope.REVIEW_FILE;
  if (scope === 'tv-audio') return AssetScope.TV_AUDIO;
  if (scope === 'tv-meme') return AssetScope.TV_MEME;
  if (scope === 'qr') return AssetScope.QR;
  return AssetScope.OTHER;
}

function extensionFromName(fileName: string) {
  const ext = path.extname(fileName || '').trim();
  return ext || '.bin';
}

export const uploadsRouter = Router();

uploadsRouter.post('/uploads/:scope', requireAuth, upload.single('file'), async (request, response, next) => {
  try {
    const file = request.file;
    if (!file) {
      throw new HttpError(400, 'File is required');
    }

    const scope = readParam(request.params.scope);
    const storageId = String(
      request.body?.storageId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
    const diskPath = await saveUploadedAsset({
      scope,
      storageId,
      buffer: file.buffer,
      extension: extensionFromName(file.originalname),
    });

    await prisma.uploadedAsset.upsert({
      where: { id: storageId },
      update: {
        scope: normalizeScope(scope),
        originalName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        diskPath,
      },
      create: {
        id: storageId,
        scope: normalizeScope(scope),
        originalName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        diskPath,
      },
    });

    response.status(201).json({
      id: storageId,
      fileName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size,
      url: `/api/uploads/${scope}/${storageId}`,
    });
  } catch (error) {
    next(error);
  }
});

uploadsRouter.get('/uploads/:scope/:assetId', requireAuth, async (request, response, next) => {
  try {
    const asset = await prisma.uploadedAsset.findUnique({ where: { id: readParam(request.params.assetId) } });
    if (!asset) {
      throw new HttpError(404, 'Asset not found');
    }

    const buffer = await fs.readFile(asset.diskPath);
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', String(asset.size));
    response.setHeader(
      'Content-Disposition',
      `inline; filename=\"${encodeURIComponent(asset.originalName)}\"`
    );
    response.send(buffer);
  } catch (error) {
    next(error);
  }
});

uploadsRouter.delete('/uploads/:scope/:assetId', requireAuth, async (request, response, next) => {
  try {
    const asset = await prisma.uploadedAsset.findUnique({ where: { id: readParam(request.params.assetId) } });
    if (!asset) {
      response.status(204).send();
      return;
    }

    await deleteUploadedAsset(asset.diskPath);
    await prisma.uploadedAsset.delete({ where: { id: asset.id } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
