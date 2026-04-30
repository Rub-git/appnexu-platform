import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCustomDomain } from '@/lib/custom-domain';
import { getAppAssetVersion, getAppCacheName, getAppCachePrefix } from '@/lib/pwa-assets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const normalizedDomain = normalizeCustomDomain(domain);

    const app = await prisma.appProject.findUnique({
      where: { customDomain: normalizedDomain },
    });

    if (!app || app.status !== 'PUBLISHED') {
      return new NextResponse('App not found', { status: 404 });
    }

    const version = getAppAssetVersion(app);
    const cachePrefix = getAppCachePrefix(app.id);
    const cacheName = getAppCacheName(app.id, version);

    const swScript = `
const CACHE_NAME = '${cacheName}';
const CACHE_PREFIX = '${cachePrefix}';
const APP_SCOPE = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name.startsWith(CACHE_PREFIX)) {
            return caches.delete(name);
          }
          return Promise.resolve(false);
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.pathname.startsWith(APP_SCOPE)) return;
  if (url.origin !== self.location.origin) return;

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
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response('Offline', { status: 503 });
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
    .catch(() => null);

  if (cachedResponse) {
    fetchPromise;
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;
  return new Response('Network error', { status: 503 });
}

self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(${JSON.stringify(app.appName)}, options));
});
`;

    return new NextResponse(swScript, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Service-Worker-Allowed': '/',
      },
    });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
