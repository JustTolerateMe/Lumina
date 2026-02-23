import { HistoryEntry } from '../types';

const DB_NAME = 'lumina-history';
const DB_VERSION = 1;
const STORE_NAME = 'generations';
const MAX_ENTRIES = 50;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function enforceLimit(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const countReq = store.count();

  await new Promise<void>((resolve, reject) => {
    countReq.onsuccess = () => {
      const count = countReq.result;
      if (count <= MAX_ENTRIES) { resolve(); return; }

      const toDelete = count - MAX_ENTRIES;
      const index = store.index('timestamp');
      const cursor = index.openCursor(null, 'next');
      let deleted = 0;

      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c && deleted < toDelete) {
          store.delete(c.primaryKey);
          deleted++;
          c.continue();
        } else {
          resolve();
        }
      };
      cursor.onerror = () => reject(cursor.error);
    };
    countReq.onerror = () => reject(countReq.error);
  });
  db.close();
}

export async function saveGeneration(entry: HistoryEntry): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(entry);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await enforceLimit();
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const index = tx.objectStore(STORE_NAME).index('timestamp');
  const request = index.openCursor(null, 'prev');
  const entries: HistoryEntry[] = [];

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        entries.push(cursor.value as HistoryEntry);
        cursor.continue();
      } else {
        db.close();
        resolve(entries);
      }
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearHistory(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function generateThumbnail(
  base64: string,
  mimeType: string,
  maxDim = 200
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const thumbBase64 = dataUrl.split(',')[1] ?? '';
      resolve({ base64: thumbBase64, mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve({ base64: '', mimeType: 'image/jpeg' });
    img.src = `data:${mimeType};base64,${base64}`;
  });
}
