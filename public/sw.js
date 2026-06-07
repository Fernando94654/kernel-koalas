// Service worker mínimo: cachea el app shell para arranque offline.
// Estrategia: network-first para navegación/HTML (siempre muestra lo último
// cuando hay red, y cae al caché si no la hay); cache-first solo para estáticos.
const CACHE = "order-rescue-v2";
const SHELL = ["/", "/semaforo", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  // No interceptar las llamadas a la API (datos dinámicos)
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/")) return;

  // Navegación / documentos HTML → network-first (refleja cambios al instante).
  const isNavigation =
    request.mode === "navigate" || request.destination === "document";

  if (isNavigation) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/"))),
    );
    return;
  }

  // Estáticos → cache-first con repoblado en segundo plano.
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
