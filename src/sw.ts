/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

// Service worker, built by vite-plugin-pwa (vite.config.ts). Production only.
//
// - Static assets (hashed JS/CSS) are precached, so the app's code loads without the network.
// - Page loads are network-first: the server-rendered page is used when it answers within 3 s,
//   and the last copy of that page from this device otherwise. That copy carries the pantry as it
//   was then; the persisted query cache (IndexedDB) supplies anything newer.
// - Product pictures from Open Food Facts are cached once seen, so the list keeps its images
//   offline. They are public files, but which ones are cached shows what you keep at home, so
//   they are removed on sign-out like the pages (src/domains/offline/persister.ts).
// - Server functions, auth and anything else that isn't a page load are never cached here.

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

// Workbox replaces this exact name with the list of files to precache.
// oxlint-disable-next-line no-underscore-dangle
const manifest = self.__WB_MANIFEST;

// A page cached by one deploy links to that deploy's assets, which are gone after the next one.
// Naming the cache after the precache list makes every deploy start a fresh page cache.
const build = hash(manifest.map((entry) => (typeof entry === "string" ? entry : entry.url)).join());
const pagesCache = `pages-${build}`;

function hash(text: string) {
  let value = 5381;
  for (let i = 0; i < text.length; i++) value = ((value << 5) + value + text.charCodeAt(i)) | 0;
  return (value >>> 0).toString(36);
}

cleanupOutdatedCaches();
precacheAndRoute(manifest);

self.addEventListener("install", () => void self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("pages-") && name !== pagesCache) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

registerRoute(
  ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: pagesCache,
    networkTimeoutSeconds: 3,
    plugins: [
      {
        // A redirected response can't be used to answer a navigation later, and an error page
        // must not replace a good copy.
        cacheWillUpdate: async ({ response }) =>
          response.status === 200 && !response.redirected ? response : null,
      },
    ],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.destination === "image" && url.origin === "https://images.openfoodfacts.org",
  new CacheFirst({
    cacheName: "product-images",
    plugins: [
      // Requested in CORS mode (see StockView), so a good answer is a plain 200.
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 90 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Offline at a page that was never loaded here: go to the pantry, which has a copy if the app has
// been used. (Serving the pantry's HTML at another URL would hydrate the wrong page.)
setCatchHandler(async ({ request, url }) => {
  if (request.mode !== "navigate" || url.pathname === "/pantry") return Response.error();
  return Response.redirect(new URL("/pantry", url).href, 302);
});
