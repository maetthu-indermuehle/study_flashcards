// PPL Flashcards service worker — v1
// Strategy:
//   - Static assets (JS, CSS, images, fonts): cache-first, update in background.
//   - Navigation requests (HTML): network-first, fall back to cache if offline.
//
// PWA install and offline caching both require HTTPS (or localhost).
// When running via local Docker on the LAN the service worker registers but
// fetch interception only applies to same-origin requests.

const CACHE = "ppl-v1";

// Assets to pre-cache on install (the app shell).
// Paths are relative to the origin — Next.js serves these as static files.
const PRECACHE = ["/", "/study", "/cards"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Delete caches from old versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internal routes and API calls — always network.
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    // Static assets: cache-first.
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
    return;
  }

  // Navigation: network-first, fall back to cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
  }
});
