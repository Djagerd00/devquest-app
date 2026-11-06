// DevQuest v1.0.0-onefile-f5f148191d07: single-file GitHub Pages build.
const VERSION = "v1.0.0-onefile-f5f148191d07";
const PREFIX = `devquest:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/icon-maskable-512.png", "./assets/icon.svg"];
const url = path => new URL(path, self.registration.scope).href;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(url(path), { cache: "reload" })))));
});
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === "navigate") return (await cache.match(url("./index.html"))) || fetch(request);
    return (await cache.match(request, { ignoreSearch: true })) || fetch(request);
  })());
});
