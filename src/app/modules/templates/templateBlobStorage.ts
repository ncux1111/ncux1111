import { deleteApiAsset, isApiPersistenceEnabled, loadApiAssetBlob, uploadApiAsset } from '../../services/api-client';

const DB_NAME = 'employee-rating-templates-db';
const DB_VERSION = 1;
const STORE_DOCX = 'document-template-blobs';

interface TemplateBlobRecord {
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
    request.onerror = () => reject(request.error || new Error('Failed to open template DB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DOCX)) {
        db.createObjectStore(STORE_DOCX, { keyPath: 'id' });
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
        const tx = db.transaction(STORE_DOCX, mode);
        const store = tx.objectStore(STORE_DOCX);
        const request = run(store);

        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
        request.onsuccess = () => resolve(request.result);

        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      })
  );
}

export async function saveTemplateBlob(storageId: string, blob: Blob) {
  if (isApiPersistenceEnabled()) {
    await uploadApiAsset('template', blob, { storageId, fileName: `${storageId}.docx` });
    return;
  }

  const payload: TemplateBlobRecord = {
    id: storageId,
    blob,
    updatedAt: Date.now(),
  };
  await withStore('readwrite', (store) => store.put(payload));
}

export async function loadTemplateBlob(storageId: string): Promise<Blob | null> {
  if (isApiPersistenceEnabled()) {
    return loadApiAssetBlob('template', storageId);
  }

  const record = await withStore<TemplateBlobRecord | undefined>('readonly', (store) =>
    store.get(storageId)
  );
  if (!record) return null;
  return record.blob || null;
}

export async function loadTemplateArrayBuffer(storageId: string): Promise<ArrayBuffer | null> {
  const blob = await loadTemplateBlob(storageId);
  if (!blob) return null;
  return blob.arrayBuffer();
}

export async function deleteTemplateBlob(storageId: string) {
  if (isApiPersistenceEnabled()) {
    await deleteApiAsset('template', storageId);
    return;
  }

  await withStore('readwrite', (store) => store.delete(storageId));
}
