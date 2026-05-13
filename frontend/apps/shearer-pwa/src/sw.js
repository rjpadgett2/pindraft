/**
 * Minimal service worker for Pindraft Shearer PWA.
 *
 * Strategy:
 *   - Static assets: cache-first. Falls back to cache when offline.
 *   - API requests (/api/*): network-first. Goes online if possible, else fails.
 *
 * API failures bubble up to the app code, which writes to the IndexedDB outbox
 * (in offline-queue.service.ts) and retries when connectivity returns. This is
 * the right separation: the service worker handles network plumbing, the app
 * code handles offline semantics.
 */

const CACHE_NAME = 'shearer-pwa-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.warn('SW install cache failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept POST/PUT/PATCH/DELETE — those need to go straight to network
  if (event.request.method !== 'GET') return;

  // Network-first for API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        // Cache successful responses for future offline access
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
