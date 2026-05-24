'use client';

import { useEffect } from 'react';

interface PwaScopeIsolationProps {
  appId: string;
  assetVersion: string;
}

function isHostServiceWorker(scriptUrl: string, appId: string): boolean {
  try {
    const pathname = new URL(scriptUrl).pathname;
    if (pathname.includes(`/pwa/${appId}/sw.js`)) return false;
    return pathname === '/sw.js' || pathname.includes('/app/sw.js') || pathname.includes('/[locale]/app/sw.js');
  } catch {
    return false;
  }
}

export default function PwaScopeIsolation({ appId, assetVersion }: PwaScopeIsolationProps) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const scope = `/pwa/${appId}/`;
    const swUrl = `/pwa/${appId}/sw.js`;

    const isolate = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterTasks = registrations
        .filter((registration) => {
          const scriptUrl =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            '';
          return scriptUrl.length > 0 && isHostServiceWorker(scriptUrl, appId);
        })
        .map((registration) => registration.unregister());

      if (unregisterTasks.length > 0) {
        await Promise.allSettled(unregisterTasks);
      }

      try {
        const registration = await navigator.serviceWorker.register(swUrl, { scope });
        console.log('[PWA-Debug] scoped SW active', { scope: registration.scope, swUrl });
      } catch (error) {
        console.warn('[PWA-Debug] scoped SW register failed', error);
      }
    };

    void isolate();
  }, [appId, assetVersion]);

  return null;
}