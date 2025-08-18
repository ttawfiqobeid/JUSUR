const CACHE_NAME = 'jusur-calc-v3';
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Helper to cache all files in /assets dynamically
async function cacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch('/');
  const htmlText = await response.text();
  
  // Regex to find asset URLs in the built HTML
  const assetUrls = [...htmlText.matchAll(/\/assets\/[^\s"']+/g)].map(match => match[0]);
  
  // Combine with core assets
  const urlsToCache = Array.from(new Set([...CORE_ASSETS, ...assetUrls]));
  await cache.addAll(urlsToCache);
}

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(cacheAssets());
});

// Activate event – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      )
    )
  );
});

// Fetch event – cache-first with background update
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        });

        return cachedResponse || networkFetch;
      })
    );
  }
});
