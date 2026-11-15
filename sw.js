// ============================================================
// TADASHI LifeOS — High-Performance Service Worker
// Network-first for HTML, Cache-first for versioned assets
// ============================================================

const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `tadashi-shell-${BUILD_ID}`;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/tailwind.css',
  './js/data.js?v=5.8',
  './js/db.js?v=5.8',
  './js/utils.js?v=5.8',
  './js/lib/ai.js?v=5.8',
  './js/lib/voice.js?v=5.8',
  './js/domain-pages.js?v=5.8',
  './js/assistant/reactor-ui.js?v=5.8',
  './js/assistant/ai-router.js?v=5.8',
  './js/assistant/scheduler.js?v=5.8',
  './js/assistant/sync-engine.js?v=5.8',
  './js/assistant/memory.js?v=5.8',
  './js/assistant/skill-runtime.js?v=5.8',
  './js/assistant/tool-registry.js?v=5.8',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('TADASHI SW: precache warning', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Pass-through for AI / gateway / backend endpoints
  if (
    url.hostname === '127.0.0.1' ||
    url.hostname === 'localhost' ||
    url.pathname.includes('/v1/') ||
    url.pathname.includes('/sync/') ||
    url.pathname.includes('/auth/') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  // Network-first for navigation and HTML documents
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});

// Push notification event listener
self.addEventListener('push', (event) => {
  let data = { title: 'TADASHI Notification', body: 'New LifeOS update.' };
  try {
    data = event.data ? event.data.json() : data;
  } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'assets/icon-192.png',
      badge: 'assets/icon-192.png'
    })
  );
});
