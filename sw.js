// ============================================================
// sw.js — Service Worker (offline rejim)
// Ilova fayllarini keshlaydi — internet bo'lmasa ham ochiladi.
// ============================================================
const CACHE = 'fayzfood-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/seed.js',
  './js/migrations.js',
  './js/util.js',
  './js/repo.js',
  './js/state.js',
  './js/screens/login.js',
  './js/screens/kassa.js',
  './js/screens/menu.js',
  './js/screens/warehouse.js',
  './js/screens/expenses.js',
  './js/screens/reports.js',
  './js/screens/settings.js',
  './js/screens/courier.js',
  './js/screens/delivery.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first: avval keshdan, bo'lmasa tarmoqdan
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
