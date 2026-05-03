const CACHE_NAME = 'trading-journal-v1';
const urlsToCache = [
    '/trading-journal/',
    '/trading-journal/index.html',
    '/trading-journal/css/style.css',
    '/trading-journal/js/app.js',
    '/trading-journal/manifest.json',
    '/trading-journal/images/icon-192.svg',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});