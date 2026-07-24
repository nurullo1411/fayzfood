// ============================================================
// db.js — Offline-first ma'lumotlar bazasi (IndexedDB)
// Har bir yozuvda: id (UUID), created_at, updated_at, sync_status, is_deleted
// Bu qatlam keyinchalik serverga (Supabase) sinxronlash uchun tayyor.
// ============================================================

const DB_NAME = 'fayzfood';
const DB_VERSION = 1;

// Barcha jadvallar (object stores)
const STORES = [
  'users', 'categories', 'products', 'ingredients', 'recipes',
  'orders', 'order_items', 'stock_movements', 'expenses', 'settings'
];

let _db = null;

// UUID generatsiya (offline'da to'qnashmaydi)
export function uuid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function now() { return new Date().toISOString(); }

// Bazani ochish / yaratish
export function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('sync_status', 'sync_status', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }
      });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return _db.transaction(store, mode).objectStore(store);
}

// --- CRUD ---

// Yangi yozuv qo'shish (yoki to'liq almashtirish)
export async function put(store, record) {
  await openDB();
  const r = { ...record };
  if (!r.id) r.id = uuid();
  if (!r.created_at) r.created_at = now();
  r.updated_at = now();
  r.sync_status = r.sync_status || 'pending';
  if (r.is_deleted === undefined) r.is_deleted = false;
  return new Promise((resolve, reject) => {
    const req = tx(store, 'readwrite').put(r);
    req.onsuccess = () => resolve(r);
    req.onerror = () => reject(req.error);
  });
}

// ID bo'yicha olish
export async function get(store, id) {
  await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(store).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// Hammasini olish (o'chirilmaganlar)
export async function getAll(store, { includeDeleted = false } = {}) {
  await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(store).getAll();
    req.onsuccess = () => {
      let rows = req.result || [];
      if (!includeDeleted) rows = rows.filter(r => !r.is_deleted);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

// Yumshoq o'chirish (soft delete) — sync uchun saqlanadi
export async function remove(store, id) {
  const rec = await get(store, id);
  if (!rec) return null;
  rec.is_deleted = true;
  return put(store, rec);
}

// Filtrlash (predikat bo'yicha)
export async function where(store, predicate) {
  const rows = await getAll(store);
  return rows.filter(predicate);
}

// Sinxronlanmagan yozuvlar (kelajakdagi server sync uchun)
export async function pending(store) {
  const rows = await getAll(store, { includeDeleted: true });
  return rows.filter(r => r.sync_status === 'pending');
}

// Bazani tozalash (test uchun)
export async function clearAll() {
  await openDB();
  return Promise.all(STORES.map(name => new Promise((resolve, reject) => {
    const req = tx(name, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  })));
}

export { STORES };
