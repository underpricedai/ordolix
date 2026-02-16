/// <reference lib="webworker" />

/**
 * Ordolix Service Worker
 *
 * Strategies:
 *   - Install: Pre-cache the offline fallback page
 *   - Activate: Purge old cache versions
 *   - Fetch (API routes): Network-first, silent failure
 *   - Fetch (static assets): Cache-first, populate on miss
 *   - Fetch (pages): Network-first, fallback to offline page
 */

const CACHE_NAME = "ordolix-v1";
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache on install
const PRECACHE_ASSETS = [OFFLINE_URL];

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Network-first for API routes (tRPC, REST, auth)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/trpc/")
  ) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cache-first for static assets (Next.js bundles, fonts, images, CSS, JS)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(
      /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot|css|js)$/,
    )
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            // Only cache successful responses
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Network-first for navigation / pages, fallback to offline page
  event.respondWith(
    fetch(request).catch(() =>
      caches
        .match(request)
        .then((cached) => cached || caches.match(OFFLINE_URL)),
    ),
  );
});
