import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppCacheName, getAppCachePrefix } from '@/lib/pwa-assets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function normalizeServiceWorkerScope(scope: string | null): string {
    if (!scope) {
        return '/';
    }

    try {
        const decoded = decodeURIComponent(scope).trim();
        if (!decoded.startsWith('/')) {
            return '/';
        }

        return decoded;
    } catch {
        return '/';
    }
}

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

        const requestUrl = new URL(request.url);
        const version = requestUrl.searchParams.get('v') || String(app.updatedAt.getTime());
        const serviceWorkerScope = normalizeServiceWorkerScope(requestUrl.searchParams.get('scope'));
        const cachePrefix = getAppCachePrefix(id);
        const cacheName = getAppCacheName(id, version);

        // Service worker is intentionally generic so generated PWAs do not depend on
        // appnexu-specific routes for start URL/scope.
        const swScript = `
// Service Worker for ${app.appName}
// Generated for app ID: ${id}

    const CACHE_NAME = '${cacheName}';
    const CACHE_PREFIX = '${cachePrefix}';
    const APP_SCOPE = '${serviceWorkerScope}';

self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        self.skipWaiting()
    );
});

self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName.startsWith(CACHE_PREFIX)) {
                            console.log('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                        return Promise.resolve(false);
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') {
        return;
    }

    if (!url.pathname.startsWith(APP_SCOPE)) {
        return;
    }

    // Generated app target can be cross-origin. Do not intercept those requests.
    if (url.origin !== self.location.origin) {
        return;
    }

    // Network first for navigations, stale-while-revalidate for static assets.
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[ServiceWorker] Network failed, trying cache:', error);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response(
            '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
            {
                headers: { 'Content-Type': 'text/html' }
            }
        );
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('[ServiceWorker] Fetch failed:', error);
            return null;
        });

    if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        fetchPromise;
        return cachedResponse;
    }

    console.log('[ServiceWorker] Fetching from network:', request.url);
    const networkResponse = await fetchPromise;

    if (networkResponse) {
        return networkResponse;
    }

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

self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received');

    const options = {
        body: event.data ? event.data.text() : 'New notification',
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
                'Service-Worker-Allowed': serviceWorkerScope,
            },
        });
    } catch (error) {
        console.error('Service Worker Generation Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
