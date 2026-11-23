/* Hisobla — oflayn ishlash uchun service worker.
   Vite fayl nomlariga xesh qo'shadi (index-AbC123.js), shuning uchun ularni ro'yxatda emas,
   birinchi ochilganda keshga olamiz. Yangi versiya chiqarilganda VERSION ni o'zgartiring. */
const VERSION = "hisobla-v7";
const CORE = ["./", "index.html", "avatar.svg", "avatar.png", "icon-192.png", "manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
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
    const timeout = new Promise(resolve => setTimeout(resolve, 2500));
    const fast = await Promise.race([network.catch(() => null), timeout]);
    if (fast) return fast;
    return (await cache.match(request, { ignoreSearch: true })) || network;
  })());
});
