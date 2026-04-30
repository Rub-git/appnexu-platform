'use client';

import { useEffect, useMemo, useState } from 'react';

type ManifestData = {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  id?: string;
  icons?: Array<{ src?: string; sizes?: string }>;
};

interface PwaInstallDiagnosticsProps {
  appId: string;
  manifestHref: string;
}

type SwRegistrationRow = {
  scope: string;
  active: string | null;
  waiting: string | null;
  installing: string | null;
};

function shouldShowPanel(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('pwaDebug') === '1';
}

export default function PwaInstallDiagnostics({ appId, manifestHref }: PwaInstallDiagnosticsProps) {
  const [beforeInstallPromptFired, setBeforeInstallPromptFired] = useState(false);
  const [displayModeStandalone, setDisplayModeStandalone] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [detectedManifestHref, setDetectedManifestHref] = useState('');
  const [manifestJson, setManifestJson] = useState<ManifestData | null>(null);
  const [manifestJsonRaw, setManifestJsonRaw] = useState('');
  const [swRegs, setSwRegs] = useState<SwRegistrationRow[]>([]);
  const [icon192Status, setIcon192Status] = useState('pending');
  const [icon512Status, setIcon512Status] = useState('pending');

  const expectedScope = `/pwa/${appId}/`;

  useEffect(() => {
    if (!shouldShowPanel()) return;

    const update = async () => {
      setCurrentUrl(window.location.href);
      setDisplayModeStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      );

      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      const href = manifestLink?.href || '';
      setDetectedManifestHref(href);

      if (href) {
        try {
          const res = await fetch(href, { cache: 'no-store' });
          const text = await res.text();
          setManifestJsonRaw(text);
          const json = JSON.parse(text) as ManifestData;
          setManifestJson(json);

          const icon192 = json.icons?.find((icon) => icon.sizes === '192x192' || (icon.src || '').includes('icon-192'))?.src;
          const icon512 = json.icons?.find((icon) => icon.sizes === '512x512' || (icon.src || '').includes('icon-512'))?.src;

          if (icon192) {
            const iconRes = await fetch(icon192, { method: 'GET', cache: 'no-store' });
            setIcon192Status(String(iconRes.status));
          } else {
            setIcon192Status('missing');
          }

          if (icon512) {
            const iconRes = await fetch(icon512, { method: 'GET', cache: 'no-store' });
            setIcon512Status(String(iconRes.status));
          } else {
            setIcon512Status('missing');
          }
        } catch {
          setManifestJson(null);
          setManifestJsonRaw('manifest fetch/parse failed');
          setIcon192Status('error');
          setIcon512Status('error');
        }
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        setSwRegs(registrations.map((registration) => ({
          scope: registration.scope,
          active: registration.active?.scriptURL || null,
          waiting: registration.waiting?.scriptURL || null,
          installing: registration.installing?.scriptURL || null,
        })));
      }
    };

    const handleBeforeInstallPrompt = () => {
      setBeforeInstallPromptFired(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    update().catch(() => {});

    const interval = window.setInterval(() => {
      update().catch(() => {});
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.clearInterval(interval);
    };
  }, [appId]);

  const installabilityHint = useMemo(() => {
    if (!manifestJson) return 'manifest missing';
    if (manifestJson.scope !== expectedScope) return `scope mismatch (${manifestJson.scope || 'none'})`;
    if ((manifestJson.start_url || '') !== `${expectedScope}launch`) return `start_url mismatch (${manifestJson.start_url || 'none'})`;
    if (icon192Status !== '200' || icon512Status !== '200') return `icon status 192=${icon192Status} 512=${icon512Status}`;
    return 'manifest+scope checks passed';
  }, [manifestJson, expectedScope, icon192Status, icon512Status]);

  if (!shouldShowPanel()) return null;

  return (
    <aside className="mx-auto mt-4 w-full max-w-3xl rounded-lg border border-slate-300 bg-white/95 p-4 text-xs text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <p className="mb-2 font-semibold">PWA Installability Diagnostics</p>
      <div className="grid grid-cols-[220px_1fr] gap-x-2 gap-y-1 break-all">
        <span>current URL</span><span>{currentUrl || 'n/a'}</span>
        <span>manifest href detected</span><span>{detectedManifestHref || 'n/a'}</span>
        <span>manifest href expected</span><span>{manifestHref}</span>
        <span>manifest JSON loaded</span><span>{manifestJson ? 'true' : 'false'}</span>
        <span>manifest name</span><span>{manifestJson?.name || 'n/a'}</span>
        <span>manifest short_name</span><span>{manifestJson?.short_name || 'n/a'}</span>
        <span>manifest id</span><span>{manifestJson?.id || 'n/a'}</span>
        <span>manifest start_url</span><span>{manifestJson?.start_url || 'n/a'}</span>
        <span>manifest scope</span><span>{manifestJson?.scope || 'n/a'}</span>
        <span>service worker registrations</span><span>{swRegs.length > 0 ? JSON.stringify(swRegs) : '[]'}</span>
        <span>beforeinstallprompt fired</span><span>{String(beforeInstallPromptFired)}</span>
        <span>display-mode standalone</span><span>{String(displayModeStandalone)}</span>
        <span>icon 192 status</span><span>{icon192Status}</span>
        <span>icon 512 status</span><span>{icon512Status}</span>
        <span>installability hint</span><span>{installabilityHint}</span>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer">Manifest raw JSON</summary>
        <pre className="mt-2 max-h-56 overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">{manifestJsonRaw || 'n/a'}</pre>
      </details>
    </aside>
  );
}
