// ============================================================
// TADASHI LifeOS — Service Worker (Phase 7)
// Provides offline app shell caching and web push notification hooks
// ============================================================

const CACHE_NAME = 'tadashi-shell-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './js/data.js',
  './js/db.js',
  './js/utils.js',
  './js/lib/ai.js',
  './js/lib/voice.js',
  './js/domain-pages.js?v=5.2',
  './js/assistant/reactor-ui.js',
  './js/assistant/ai-router.js',
  './js/assistant/scheduler.js',
  './js/assistant/sync-engine.js',
  './js/assistant/memory.js',
  './js/assistant/skill-runtime.js',
  './js/assistant/tool-registry.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
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
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  // Let external API requests pass through
  if (event.request.url.includes('/sync/') || event.request.url.includes('/auth/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => {
        // Fallback for document navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
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
      icon: 'favicon.ico',
      badge: 'favicon.ico'
    })
  );
});
