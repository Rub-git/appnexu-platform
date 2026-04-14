import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const app = await prisma.appProject.findUnique({
            where: { id: id },
        });

        if (!app) {
            return new NextResponse('App not found', { status: 404 });
        }

        // Service Worker with stale-while-revalidate strategy
        const swScript = `
// Service Worker for ${app.appName}
// Generated for app ID: ${id}

const CACHE_NAME = 'pwa-cache-v1-${id}';
const OFFLINE_URL = '/offline.html';

// Resources to pre-cache during installation
const PRECACHE_URLS = [
    '/app/${app.slug}?pwa=true',
    '/app/${app.slug}',
    OFFLINE_URL,
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install event - precache essential resources
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Precaching app shell');
                // Use addAll with catch for graceful failure
                return Promise.allSettled(
                    PRECACHE_URLS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn('[ServiceWorker] Failed to cache:', url, err);
                        })
                    )
                );
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches that don't match current version
                        if (cacheName !== CACHE_NAME && cacheName.startsWith('pwa-cache-')) {
                            console.log('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Take control of all pages immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-HTTP(S) schemes (e.g., chrome-extension://)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip cross-origin requests (except for images)
    if (url.origin !== self.location.origin && !request.destination.includes('image')) {
        return;
    }

    // Handle navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    // Handle all other requests with stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// Navigation request handler with offline fallback
async function handleNavigationRequest(request) {
    try {
        // Try network first for navigation
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[ServiceWorker] Navigation fetch failed, trying cache:', error);
        
        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If not in cache, serve offline page
        const offlineResponse = await caches.match(OFFLINE_URL);
        if (offlineResponse) {
            return offlineResponse;
        }
        
        // Last resort: return a basic offline response
        return new Response(
            '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
            {
                headers: { 'Content-Type': 'text/html' }
            }
        );
    }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Start fetching from network in background
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            // Only cache valid responses
            if (networkResponse && networkResponse.ok) {
                // Clone the response before caching
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('[ServiceWorker] Fetch failed:', error);
            return null;
        });

    // Return cached response immediately if available
    // Otherwise wait for network response
    if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        // Revalidate in background (don't await)
        fetchPromise;
        return cachedResponse;
    }

    // No cache, wait for network
    console.log('[ServiceWorker] Fetching from network:', request.url);
    const networkResponse = await fetchPromise;
    
    if (networkResponse) {
        return networkResponse;
    }
    
    // Network failed and no cache - return error response
    return new Response('Network error', { status: 503 });
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[ServiceWorker] Cache cleared');
        });
    }
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
    };
    
    event.waitUntil(
        self.registration.showNotification('${app.appName}', options)
    );
});

console.log('[ServiceWorker] Loaded for ${app.appName}');
`;

        return new NextResponse(swScript, {
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Service-Worker-Allowed': '/',
            },
        });
    } catch (error) {
        console.error('Service Worker Generation Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
