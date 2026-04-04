const CACHE_NAME = 'vba-beast-v3.2.0';
const ASSETS = [
  './',
  './vba-beast-v3_z.html',
  './lib/xlsx.min.js',
  './lib/mammoth.min.js',
  './lib/chart.min.js',
  './lib/jspdf.min.js',
  './lib/jspdf-autotable.min.js',
  './fonts/ibm-plex-mono-400.woff2',
  './fonts/ibm-plex-mono-500.woff2',
  './fonts/ibm-plex-mono-600.woff2',
  './fonts/ibm-plex-mono-700.woff2',
  './fonts/dm-sans.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
