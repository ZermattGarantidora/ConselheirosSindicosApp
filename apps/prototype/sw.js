const CACHE_NAME = "cora-prototype-shell-v2";
const SHELL_ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest"];
const SHELL_PATHS = new Set(SHELL_ASSETS.map((asset) => new URL(asset, self.location).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !SHELL_PATHS.has(url.pathname)
  )
    return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
