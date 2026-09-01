const CACHE_NAME = 'srmap-portal-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/login.html',
  '/manifest.json',
  '/pwa-192x192.jpg',
  '/pwa-512x512.jpg',
  '/apple-touch-icon.jpg'
];

// Install Service Worker and Precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clientsClaim();
});

// Intercept and cache requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip POST requests or external API calls (auth, login, captcha)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/session')) {
    return;
  }

  // Caching strategy: Network-First for same-origin API calls (like timetable/grades) to ensure real data, but with a Cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First strategy for static assets & Google Fonts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Only cache valid GET responses
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
