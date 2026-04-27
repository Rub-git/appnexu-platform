'use client';

import { useEffect, useState } from 'react';

type ManifestShape = {
  id?: string;
  name?: string;
  short_name?: string;
  icons?: Array<{ src?: string }>;
};

interface GeneratedAppRuntimeProps {
  appId: string;
  slug: string;
  targetUrl: string;
  manifestHref: string;
  cachePrefix: string;
}

function hasHostScope(scriptUrl: string, appId: string): boolean {
  try {
    const pathname = new URL(scriptUrl).pathname;
    if (pathname.includes(`/pwa/${appId}/sw.js`)) return false;
    return pathname === '/sw.js' || pathname.includes('/app/sw.js') || pathname.includes('/[locale]/app/sw.js');
  } catch {
    return false;
  }
}

export default function GeneratedAppRuntime({
  appId,
  slug,
  targetUrl,
  manifestHref,
  cachePrefix,
}: GeneratedAppRuntimeProps) {
  const [manifestData, setManifestData] = useState<ManifestShape | null>(null);
  const [controller, setController] = useState('none');

  useEffect(() => {
    const links = Array.from(document.querySelectorAll('link[rel="manifest"]')) as HTMLLinkElement[];
    links.forEach((link) => {
      if (link.href !== new URL(manifestHref, window.location.origin).href) {
        link.remove();
      }
    });

    if (!links.some((link) => link.href === new URL(manifestHref, window.location.origin).href)) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestHref;
      manifestLink.setAttribute('data-app-manifest', 'true');
      document.head.appendChild(manifestLink);
    }

    const loadManifest = async () => {
      try {
        const response = await fetch(manifestHref, { cache: 'no-store' });
        if (!response.ok) return;
        const json = (await response.json()) as ManifestShape;
        setManifestData(json);
      } catch {
        setManifestData(null);
      }
    };

    const isolateRuntime = async () => {
      if (!('serviceWorker' in navigator)) return;

      const registrations = await navigator.serviceWorker.getRegistrations();
      const tasks = registrations
        .filter((registration) => {
          const scriptUrl =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            '';
          return scriptUrl.length > 0 && hasHostScope(scriptUrl, appId);
        })
        .map((registration) => registration.unregister());

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }

      const activeController = navigator.serviceWorker.controller?.scriptURL || 'none';
      setController(activeController);

      if (activeController !== 'none' && hasHostScope(activeController, appId)) {
        const key = `generated-runtime-reload-${appId}`;
        if (sessionStorage.getItem(key) !== '1') {
          sessionStorage.setItem(key, '1');
          window.location.reload();
          return;
        }
        sessionStorage.removeItem(key);
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => {
              if (name.startsWith(cachePrefix)) return false;
              return name.startsWith('generated-pwa-cache-') || name.startsWith('pwa-cache-v1-') || name.startsWith('appnexu-');
            })
            .map((name) => caches.delete(name)),
        );
      }
    };

    loadManifest();
    isolateRuntime().catch(() => {});
  }, [appId, manifestHref, cachePrefix]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <aside className="fixed bottom-3 right-3 z-50 w-[min(92vw,460px)] rounded-lg border border-slate-300 bg-white/95 p-3 text-xs text-slate-800 shadow-xl backdrop-blur">
      <p className="mb-2 font-semibold">Generated PWA Debug</p>
      <div className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-1 break-all">
        <span>appId</span><span>{appId}</span>
        <span>slug</span><span>{slug}</span>
        <span>targetUrl</span><span>{targetUrl}</span>
        <span>document.title</span><span>{typeof document !== 'undefined' ? document.title : 'n/a'}</span>
        <span>manifest href</span><span>{manifestHref}</span>
        <span>manifest.id</span><span>{manifestData?.id || 'n/a'}</span>
        <span>manifest.name</span><span>{manifestData?.name || 'n/a'}</span>
        <span>manifest.short_name</span><span>{manifestData?.short_name || 'n/a'}</span>
        <span>icon URL</span><span>{manifestData?.icons?.[0]?.src || 'n/a'}</span>
        <span>SW controller</span><span>{controller}</span>
        <span>cache namespace</span><span>{cachePrefix}</span>
      </div>
    </aside>
  );
}
