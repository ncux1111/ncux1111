import { deleteApiAsset, isApiPersistenceEnabled, loadApiAssetBlob, uploadApiAsset } from '../services/api-client';

const DB_NAME = 'employee-rating-review-files-db';
const DB_VERSION = 1;
const STORE_REVIEW_FILES = 'document-review-files';

interface ReviewFileRecord {
  id: string;
  blob: Blob;
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Failed to open review files DB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_REVIEW_FILES)) {
        db.createObjectStore(STORE_REVIEW_FILES, { keyPath: 'id' });
      }
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_REVIEW_FILES, mode);
        const store = tx.objectStore(STORE_REVIEW_FILES);
        const request = run(store);

        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
        request.onsuccess = () => resolve(request.result);

        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      })
  );
}

export async function saveDocumentReviewBlob(storageId: string, blob: Blob) {
  if (isApiPersistenceEnabled()) {
    await uploadApiAsset('review-file', blob, { storageId, fileName: `${storageId}.bin` });
    return;
  }

  const payload: ReviewFileRecord = {
    id: storageId,
    blob,
    updatedAt: Date.now(),
  };

  await withStore('readwrite', (store) => store.put(payload));
}

export async function loadDocumentReviewBlob(storageId: string): Promise<Blob | null> {
  if (isApiPersistenceEnabled()) {
    return loadApiAssetBlob('review-file', storageId);
  }

  const record = await withStore<ReviewFileRecord | undefined>('readonly', (store) => store.get(storageId));
  if (!record) return null;
  return record.blob || null;
}

export async function loadDocumentReviewObjectUrl(storageId: string): Promise<string | null> {
  const blob = await loadDocumentReviewBlob(storageId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function deleteDocumentReviewBlob(storageId: string) {
  if (isApiPersistenceEnabled()) {
    await deleteApiAsset('review-file', storageId);
    return;
  }

  await withStore('readwrite', (store) => store.delete(storageId));
}
