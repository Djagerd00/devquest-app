const VERSION = "v0.1.0-1";
const PREFIX = `devquest:${self.registration.scope}:`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/app.js",
  "./src/model.js",
  "./src/icons.js",
  "./src/prompts.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/crystal.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
];
const url = (path) => new URL(path, self.registration.scope).href;

self.addEventListener("install", (event) => {
  // A new worker waits for existing tabs to close, keeping each release coherent.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          SHELL.map((path) => new Request(url(path), { cache: "reload" })),
        ),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requested = new URL(request.url);
  if (
    request.method !== "GET" ||
    requested.origin !== self.location.origin ||
    !request.url.startsWith(self.registration.scope)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (request.mode === "navigate") {
        const shell = await cache.match(url("./index.html"));
        if (shell) return shell;
        return fetch(request);
      }
      const cached = await cache.match(request, { ignoreSearch: true });
      return cached || fetch(request);
    })(),
  );
});
