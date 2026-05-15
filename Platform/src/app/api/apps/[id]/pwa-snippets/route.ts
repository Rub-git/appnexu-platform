import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

function getAppDisplayName(name: string): string {
  return (name || 'My App').trim();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    const app = await prisma.appProject.findUnique({ where: { id } });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (app.userId !== session.user.id) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const appName = getAppDisplayName(app.appName);
    const shortName = (app.shortName || appName).slice(0, 12);
    const themeColor = app.themeColor || '#178BFF';
    const backgroundColor = app.backgroundColor || '#ffffff';

    const manifestJson = {
      name: appName,
      short_name: shortName,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: themeColor,
      background_color: backgroundColor,
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/maskable-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    };

    const snippets = {
      htmlHead: [
        '<link rel="manifest" href="/manifest.json" />',
        '<meta name="theme-color" content="' + themeColor + '" />',
        '<meta name="apple-mobile-web-app-capable" content="yes" />',
        '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
        '<meta name="apple-mobile-web-app-title" content="' + appName + '" />',
        '<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />',
      ].join('\n'),
      serviceWorkerRegistration: [
        'if ("serviceWorker" in navigator) {',
        '  window.addEventListener("load", () => {',
        '    navigator.serviceWorker.register("/sw.js", { scope: "/" });',
        '  });',
        '}',
      ].join('\n'),
      manifestJson: JSON.stringify(manifestJson, null, 2),
      serviceWorker: [
        'const CACHE = "app-cache-v1";',
        'self.addEventListener("install", (event) => {',
        '  event.waitUntil(self.skipWaiting());',
        '});',
        'self.addEventListener("activate", (event) => {',
        '  event.waitUntil(self.clients.claim());',
        '});',
        'self.addEventListener("fetch", (event) => {',
        '  if (event.request.method !== "GET") return;',
        '  event.respondWith(',
        '    fetch(event.request).catch(() => caches.match(event.request))',
        '  );',
        '});',
      ].join('\n'),
      expectedFiles: [
        '/manifest.json',
        '/sw.js',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
        '/icons/maskable-192x192.png',
        '/icons/maskable-512x512.png',
      ],
    };

    return apiSuccess({
      appId: app.id,
      pwaMode: app.pwaMode,
      snippets,
    });
  } catch {
    return apiError('Failed to build PWA snippets', 500, 'INTERNAL_ERROR');
  }
}
