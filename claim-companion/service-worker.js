const CACHE = "claim-companion-v4";
const SHELL = [
  "/claim-companion/",
  "/claim-companion/index.html",
  "/claim-companion/styles.css",
  "/claim-companion/app.js",
  "/claim-companion/api.js",
  "/claim-companion/calculator.js",
  "/claim-companion/extractor.js",
  "/claim-companion/config.js",
  "/claim-companion/manifest.webmanifest",
  "/claim-companion/privacy.html",
  "/claim-companion/terms.html",
  "/claim-companion/delete-data.html"
];

self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/claim-companion/"))));
});
