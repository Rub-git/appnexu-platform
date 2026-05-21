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
      start_url: `/pwa/${app.id}/launch`,
      scope: '/',
      display: 'standalone',
      theme_color: themeColor,
      background_color: backgroundColor,
      prefer_related_applications: false,
      icons: [
        {
          src: `/pwa/${app.id}/icon-192.png`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/pwa/${app.id}/icon-512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/pwa/${app.id}/maskable-icon.png`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: `/pwa/${app.id}/maskable-icon.png`,
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
        '<link rel="apple-touch-icon" href="/pwa/' + app.id + '/apple-touch-icon.png" />',
        '<link rel="icon" href="/pwa/' + app.id + '/favicon.ico" />',
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
        `/pwa/${app.id}/manifest.json`,
        `/pwa/${app.id}/sw.js`,
        `/pwa/${app.id}/icon-192.png`,
        `/pwa/${app.id}/icon-512.png`,
        `/pwa/${app.id}/apple-touch-icon.png`,
        `/pwa/${app.id}/favicon.ico`,
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
