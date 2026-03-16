const rawApiUrl = import.meta.env.VITE_API_URL?.trim() || '';

export function isApiPersistenceEnabled() {
  return rawApiUrl.length > 0;
}

export function getApiBaseUrl() {
  return rawApiUrl.replace(/\/$/, '');
}

function buildUrl(path: string) {
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

async function tryRefreshSession() {
  const response = await fetch(buildUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  });

  return response.ok;
}

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
  options: { retryOnUnauthorized?: boolean } = {}
): Promise<T> {
  if (!isApiPersistenceEnabled()) {
    throw new Error('API persistence is not enabled.');
  }

  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers || {}),
    },
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiRequest<T>(path, init, { retryOnUnauthorized: false });
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // keep fallback
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface UploadedAssetPayload {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export async function uploadApiAsset(
  scope: 'template' | 'review-file' | 'tv-audio' | 'tv-meme' | 'qr',
  file: Blob,
  options: { storageId?: string; fileName?: string } = {}
) {
  const form = new FormData();
  if (options.storageId) {
    form.set('storageId', options.storageId);
  }
  form.set('file', file, options.fileName || 'file.bin');

  return apiRequest<UploadedAssetPayload>(`/api/uploads/${scope}`, {
    method: 'POST',
    body: form,
  });
}

export async function loadApiAssetBlob(
  scope: 'template' | 'review-file' | 'tv-audio' | 'tv-meme' | 'qr',
  storageId: string
) {
  const response = await fetch(buildUrl(`/api/uploads/${scope}/${storageId}`), {
    credentials: 'include',
  });

  if (response.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return loadApiAssetBlob(scope, storageId);
    }
  }

  if (!response.ok) {
    return null;
  }

  return response.blob();
}

export async function deleteApiAsset(
  scope: 'template' | 'review-file' | 'tv-audio' | 'tv-meme' | 'qr',
  storageId: string
) {
  await apiRequest(`/api/uploads/${scope}/${storageId}`, { method: 'DELETE' });
}
