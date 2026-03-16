import { deleteApiAsset, isApiPersistenceEnabled, loadApiAssetBlob, uploadApiAsset } from '../services/api-client';

const DB_NAME = 'employee-rating-media-db';
const DB_VERSION = 2;
const STORE_TV_AUDIO = 'tv-audio-tracks';

interface TvAudioRecord {
  id: string;
  blob: Blob;
  updatedAt: number;
}

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Failed to open audio DB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TV_AUDIO)) {
        db.createObjectStore(STORE_TV_AUDIO, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tv-meme-videos')) {
        db.createObjectStore('tv-meme-videos', { keyPath: 'id' });
      }
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openAudioDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_TV_AUDIO, mode);
        const store = transaction.objectStore(STORE_TV_AUDIO);
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

export async function saveTvAudioBlob(storageId: string, blob: Blob) {
  if (isApiPersistenceEnabled()) {
    await uploadApiAsset('tv-audio', blob, { storageId, fileName: `${storageId}.bin` });
    return;
  }

  const payload: TvAudioRecord = {
    id: storageId,
    blob,
    updatedAt: Date.now(),
  };

  await withStore('readwrite', (store) => store.put(payload));
}

export async function deleteTvAudioBlob(storageId: string) {
  if (isApiPersistenceEnabled()) {
    await deleteApiAsset('tv-audio', storageId);
    return;
  }

  await withStore('readwrite', (store) => store.delete(storageId));
}

export async function loadTvAudioBlob(storageId: string): Promise<Blob | null> {
  if (isApiPersistenceEnabled()) {
    return loadApiAssetBlob('tv-audio', storageId);
  }

  const record = await withStore<TvAudioRecord | undefined>('readonly', (store) => store.get(storageId));
  if (!record) return null;
  return record.blob || null;
}

export async function loadTvAudioObjectUrl(storageId: string): Promise<string | null> {
  const blob = await loadTvAudioBlob(storageId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
