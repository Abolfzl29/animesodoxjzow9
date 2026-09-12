/* Neon Anime offline shell for GitHub Pages and the bundled PWA. */
'use strict';

const CACHE_NAME = 'neon-anime-shell-v1';
const OFFLINE_URL = new URL('./offline.html', self.registration.scope).toString();
const PRECACHE_PATHS = [
    './index.html',
    './catalog.html',
    './anime.html',
    './watch.html',
    './login.html',
    './offline.html',
    './manifest.webmanifest',
    './assets/favicon.svg',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/fonts/Vazirmatn-Variable.woff2',
    './assets/fonts/Orbitron-Variable.ttf',
    './style.css',
    './library.css',
    './data/anime.js',
    './auth.js',
    './library-backup.js',
    './pwa.js'
];

function isSameOrigin(url) {
    return url.origin === self.location.origin;
}

function isNavigation(request) {
    return request.mode === 'navigate' || request.destination === 'document';
}

function isStaticAsset(request) {
    return ['style', 'script', 'font', 'image'].includes(request.destination);
}

async function cacheResponse(request, response) {
    if (response && response.ok && isSameOrigin(new URL(request.url))) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
    }
    return response;
}

async function networkFirst(request, fallbackRequest) {
    try {
        return await cacheResponse(request, await fetch(request));
    } catch (error) {
        const cached = await caches.match(request, { ignoreSearch: isNavigation(request) });
        if (cached) return cached;
        if (fallbackRequest) {
            const fallback = await caches.match(fallbackRequest);
            if (fallback) return fallback;
        }
        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const network = fetch(request).then(response => cacheResponse(request, response)).catch(() => null);
    return cached || network || Response.error();
}

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_PATHS.map(path => new URL(path, self.registration.scope).toString())))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || !isSameOrigin(url)) return;

    // Never intercept demo/streaming video requests. They need the network and
    // may be too large to place in the browser cache.
    if (request.destination === 'video' || /\.(mp4|webm|m3u8|ts)(\?|$)/i.test(url.pathname)) return;

    if (isNavigation(request)) {
        event.respondWith(networkFirst(request, OFFLINE_URL));
        return;
    }

    if (isStaticAsset(request)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Data scripts and other same-origin GETs can update from the network but
    // remain available after a temporary connection failure.
    event.respondWith(networkFirst(request));
});
