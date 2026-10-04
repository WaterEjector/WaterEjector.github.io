const CACHE_NAME = 'waterejector-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/favicon.ico',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/components/header.html',
  '/components/footer.html',
  '/deep-clean/',
  '/vibration/',
  '/stereo-test/',
  '/frequency-generator/',
  '/charging-port-fix/',
  '/mic-test/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Some assets could not be pre-cached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip ads / analytics requests
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('google') || url.includes('doubleclick') || url.includes('formsubmit')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response and cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
