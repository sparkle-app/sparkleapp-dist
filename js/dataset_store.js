/**
 * Sparkle Internal Workspace Dataset Store (v3.7.0)
 * Supports ephemeral Session RAM (default, zero disk trace) and optional
 * browser-local IndexedDB persistence for reusing parsed attribute datasets
 * across tabs (#attributes -> #market / #dashboard).
 */

const IDB_NAME = 'sparkle_workspace_db';
const IDB_VERSION = 1;
const IDB_STORE = 'datasets';
const MAX_IDB_RECORD_BYTES = 25 * 1024 * 1024; // 25 MB single dataset guard

const sessionMap = new Map();

function sanitizeName(raw) {
  return String(raw ?? '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 120);
}

function estimateBytes(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
  if (bytes < 1024) return `${Math.round(bytes)} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

export function formatDefaultDatasetName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `Пользователь (${dd}.${mm}.${yyyy} ${hh}.${mi}.${ss})`;
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен в этом браузере.'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Не удалось открыть IndexedDB.'));
  });
}

async function idbGetAll() {
  try {
    const db = await openIdb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

async function idbPut(record) {
  const db = await openIdb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve(record);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Ошибка записи в IndexedDB (возможно, исчерпана квота или режим инкогнито).'));
    };
  });
}

async function idbDelete(id) {
  try {
    const db = await openIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch { /* ignore */ }
}

async function idbClear() {
  try {
    const db = await openIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch { /* ignore */ }
}

export const datasetStore = {
  isIndexedDbSupported() {
    return typeof indexedDB !== 'undefined';
  },

  estimateMatrixBytes(matrix) {
    return estimateBytes(matrix);
  },

  async saveDataset({ name, headers, rows, matrix, storage = 'session', source = 'attributes' }) {
    const cleanName = sanitizeName(name) || formatDefaultDatasetName();
    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record = {
      id,
      name: cleanName,
      source,
      storage: storage === 'indexeddb' ? 'indexeddb' : 'session',
      createdAt: new Date().toISOString(),
      rowCount: Array.isArray(rows) ? rows.length : Math.max(0, (matrix?.length || 1) - 1),
      colCount: Array.isArray(headers) ? headers.length + 1 : (matrix?.[0]?.length || 0),
      headers: headers || [],
      matrix: matrix || [],
      bytes: 0
    };
    record.bytes = estimateBytes(record);

    if (record.storage === 'indexeddb') {
      if (record.bytes > MAX_IDB_RECORD_BYTES) {
        throw new Error(`Датасет слишком большой для IndexedDB (${formatBytes(record.bytes)} > 25 МБ). Используйте память сессии или скачайте файл.`);
      }
      await idbPut(record);
    } else {
      sessionMap.set(id, record);
    }
    return record;
  },

  async listDatasets() {
    const ramItems = [...sessionMap.values()];
    const idbItems = await idbGetAll();
    return [...ramItems, ...idbItems].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
  },

  async removeDataset(id, storage) {
    if (storage === 'indexeddb') {
      await idbDelete(id);
    } else {
      sessionMap.delete(id);
    }
  },

  clearSession() {
    sessionMap.clear();
  },

  async clearIndexedDb() {
    await idbClear();
  },

  async getStats() {
    const ramItems = [...sessionMap.values()];
    const idbItems = await idbGetAll();
    const ramBytes = ramItems.reduce((acc, it) => acc + (it.bytes || 0), 0);
    const idbBytes = idbItems.reduce((acc, it) => acc + (it.bytes || 0), 0);

    let quotaBytes = null;
    let originUsageBytes = null;
    try {
      if (navigator.storage && typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        quotaBytes = est.quota ?? null;
        originUsageBytes = est.usage ?? null;
      }
    } catch { /* ignore */ }

    return {
      ramCount: ramItems.length,
      ramBytes,
      idbCount: idbItems.length,
      idbBytes,
      quotaBytes,
      originUsageBytes
    };
  }
};
