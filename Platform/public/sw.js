// Main Service Worker for Appnexu
// This handles caching for the dashboard and main site

const CACHE_NAME = 'appnexu-v1';
const OFFLINE_URL = '/offline.html';

// Resources to pre-cache
const PRECACHE_URLS = [
    '/',
    '/offline.html',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('[MainSW] Install');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[MainSW] Precaching app shell');
                return Promise.allSettled(
                    PRECACHE_URLS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn('[MainSW] Failed to cache:', url, err);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[MainSW] Activate');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName.startsWith('appnexu-')) {
                            console.log('[MainSW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event with stale-while-revalidate
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-HTTP requests (e.g., chrome-extension://) to avoid console errors
    if (!request.url.startsWith('http')) {
        return;
    }

    // Skip authentication/API routes - these should NEVER be cached
    if (request.url.includes('/api/auth/') || request.url.includes('/api/') && request.url.includes('session')) {
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }

    // Stale-while-revalidate for other requests
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => null);

            return cachedResponse || fetchPromise;
        })
    );
});

// Message handling
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[MainSW] Loaded');
