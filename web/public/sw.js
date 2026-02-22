const CACHE_NAME = 'lilapu-v1';
const STATIC_ASSETS = [
    '/dashboard',
    '/logo.svg',
    '/manifest.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and external requests
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    // Network-first for API/Convex calls
    if (url.pathname.startsWith('/api') || url.hostname.includes('convex')) return;

    // Cache-first for static assets
    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request))
    );
});
