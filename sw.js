/* Hisobla — oflayn ishlash uchun service worker.
   Yangi versiya chiqarilganda VERSION ni o'zgartiring. */
const VERSION = "hisobla-v3";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "math-core.js",
  "app.js",
  "avatar.svg",
  "avatar.png",
  "icon-192.png",
  "manifest.webmanifest",
  "fonts/dm-sans.woff2",
  "fonts/manrope.woff2"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/* Avval internetdan (doim yangi versiya); internet yo'q yoki 2,5 soniyadan sekin bo'lsa — keshdan */
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const network = fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });
    const cached = cache.match(request, { ignoreSearch: true });
    const timeout = new Promise(resolve => setTimeout(resolve, 2500));
    const fast = await Promise.race([network.catch(() => null), timeout]);
    if (fast) return fast;
    return (await cached) || network;
  })());
});
