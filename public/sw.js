// Floorence Service Worker — Cache-first for static assets, network-first for API
// v2: exclude Vite dep chunks from cache to prevent stale React copies
const CACHE_NAME = 'floorence-v4';
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API calls
  if (request.method !== 'GET') return;

  // Supabase / API calls → network only
  if (url.hostname.includes('supabase.co') || url.hostname.includes('lovable.dev')) return;

  // NEVER cache Vite dependency chunks or HMR — always go to network
  if (url.pathname.includes('/node_modules/.vite/') || url.pathname.includes('/@vite/') || url.search.includes('v=')) {
    return;
  }

  // Navigation requests → network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // JavaScript modules (Vite chunks + source modules) → network only to avoid stale runtime contexts
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs') || url.pathname.includes('/src/') || url.pathname.includes('/node_modules/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Other static assets (images, fonts, CSS) → cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (url.origin === self.location.origin || url.hostname.includes('fonts.g'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
