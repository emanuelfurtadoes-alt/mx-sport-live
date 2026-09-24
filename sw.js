const CACHE_NAME = 'mx-sport-runtime-v8';
const BASE_PATH = new URL('./', self.registration.scope).pathname;
const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}mx-sport-logo-v3.png`,
  `${BASE_PATH}mx-sport-icon-192-v3.png`,
  `${BASE_PATH}mx-sport-icon-512-v3.png`,
  `${BASE_PATH}mx-sport-icon-maskable-512-v3.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('mx-sport-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith(`${BASE_PATH}api/`)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(BASE_PATH, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(BASE_PATH)),
    );
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    });

    if (cached) {
      event.waitUntil(network.catch(() => undefined));
      return cached;
    }

    return network;
  })());
});
