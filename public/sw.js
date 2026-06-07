// Service worker mínimo: cachea el app shell para arranque offline.
const CACHE = "order-rescue-v1";
const SHELL = ["/", "/semaforo", "/pedido", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  // No cachear las llamadas a la API (datos dinámicos)
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.match(request).then((cached) =>
      cached ??
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached),
    ),
  );
});
