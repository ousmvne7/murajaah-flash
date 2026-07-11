const CACHE_PREFIX = "murajaah-flash";
const CACHE_VERSION = "v1";
const APP_CACHE = `${CACHE_PREFIX}-app-${CACHE_VERSION}`;
const MUSHAF_CACHE = `${CACHE_PREFIX}-mushaf-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/pwa.js",
  "./js/app.js",
  "./assets/icon.svg",
  "./assets/favicon-32.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/bismillah.png",
  "./assets/fonts/hafs.18.woff2",
  "./assets/fonts/hafs.18.ttf",
  "./data/quran-uthmani.json",
  "./data/quran-pages.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && ![APP_CACHE, MUSHAF_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_CACHE, "./index.html"));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, APP_CACHE, request));
    return;
  }

  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("quranpedia/quran-svg")) {
    event.respondWith(cacheFirst(request, MUSHAF_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) || caches.match(fallbackUrl);
  }
}
