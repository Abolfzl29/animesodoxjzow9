/* ==========================================================================
 * Neon Anime — service worker (offline + installability)
 *
 * Strategy (update-friendly, so new deploys on GitHub Pages show up):
 *   - Navigations (HTML):  NETWORK-FIRST → cache → offline fallback.
 *   - Static assets:       STALE-WHILE-REVALIDATE (instant from cache,
 *                          refreshed in the background every time).
 *   - Cross-origin (CDN / demo videos): never intercepted.
 *
 * Bump CACHE_NAME whenever the app shell changes significantly; old caches
 * are cleaned automatically on `activate`.
 * ========================================================================== */
var CACHE_NAME = 'neon-anime-v1';
var PRECACHE = [
    './',
    './index.html',
    './catalog.html',
    './schedule.html',
    './mag.html',
    './recommend.html',
    './404.html',
    './style.css',
    './catalog.css',
    './recommend.css',
    './gamification.css',
    './library.css',
    './script.js',
    './auth.js',
    './library.js',
    './gamification.js',
    './recommend.js',
    './data/anime.js',
    './data/anime-extra.js',
    './data/recommend.js',
    './data/articles.js',
    './manifest.webmanifest',
    './assets/favicon.svg',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/fonts/fonts.css'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                // addAll rejects the whole batch if a single request fails,
                // so cache each entry independently for robustness.
                return Promise.all(PRECACHE.map(function (url) {
                    return cache.add(url).catch(function () { /* ignore individual misses */ });
                }));
            })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET') return;

    var url;
    try { url = new URL(request.url); } catch (e) { return; }
    // Only handle same-origin requests; never touch CDN/video hosts.
    if (url.origin !== self.location.origin) return;

    // HTML navigations: always try the network first so updates are visible.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).then(function (response) {
                var copy = response.clone();
                caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
                return response;
            }).catch(function () {
                return caches.match(request).then(function (cached) {
                    return cached || caches.match('./index.html') || caches.match('./404.html');
                });
            })
        );
        return;
    }

    // Static assets: stale-while-revalidate.
    event.respondWith(
        caches.match(request).then(function (cached) {
            var network = fetch(request).then(function (response) {
                if (response && response.status === 200) {
                    var copy = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
                }
                return response;
            }).catch(function () { return cached; });

            return cached || network;
        })
    );
});
