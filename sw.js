// Service Worker - Trading Journal Pro
const CACHE_NAME = 'trading-journal-pro-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/images/icon-192.svg'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Ne pas intercepter les appels API
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;

      return fetch(event.request).then(function(fetchResponse) {
        if (fetchResponse && fetchResponse.status === 200) {
          var responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      });
    }).catch(function() {
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
