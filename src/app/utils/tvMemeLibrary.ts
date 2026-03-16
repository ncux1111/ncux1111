import { deleteApiAsset, isApiPersistenceEnabled, loadApiAssetBlob, uploadApiAsset } from '../services/api-client';

const DB_NAME = 'employee-rating-media-db';
const DB_VERSION = 2;
const STORE_MEME_VIDEO = 'tv-meme-videos';

interface MemeVideoRecord {
  id: string;
  blob: Blob;
  updatedAt: number;
}

function openMemeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Failed to open meme DB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tv-audio-tracks')) {
        db.createObjectStore('tv-audio-tracks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEME_VIDEO)) {
        db.createObjectStore(STORE_MEME_VIDEO, { keyPath: 'id' });
      }
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openMemeDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_MEME_VIDEO, mode);
        const store = transaction.objectStore(STORE_MEME_VIDEO);
        const request = run(store);

        request.onerror = () => {
          reject(request.error || new Error('IndexedDB request failed'));
        };
        request.onsuccess = () => {
          resolve(request.result);
        };

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          reject(transaction.error || new Error('IndexedDB transaction failed'));
        };
      })
  );
}

export async function saveMemeVideoBlob(storageId: string, blob: Blob) {
  if (isApiPersistenceEnabled()) {
    await uploadApiAsset('tv-meme', blob, { storageId, fileName: `${storageId}.bin` });
    return;
  }

  const payload: MemeVideoRecord = {
    id: storageId,
    blob,
    updatedAt: Date.now(),
  };

  await withStore('readwrite', (store) => store.put(payload));
}

export async function deleteMemeVideoBlob(storageId: string) {
  if (isApiPersistenceEnabled()) {
    await deleteApiAsset('tv-meme', storageId);
    return;
  }

  await withStore('readwrite', (store) => store.delete(storageId));
}

export async function loadMemeVideoBlob(storageId: string): Promise<Blob | null> {
  if (isApiPersistenceEnabled()) {
    return loadApiAssetBlob('tv-meme', storageId);
  }

  const record = await withStore<MemeVideoRecord | undefined>('readonly', (store) => store.get(storageId));
  if (!record) return null;
  return record.blob || null;
}

export async function loadMemeVideoObjectUrl(storageId: string): Promise<string | null> {
  const blob = await loadMemeVideoBlob(storageId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
