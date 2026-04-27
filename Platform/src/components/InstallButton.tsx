'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Download, Check, Loader2, ExternalLink, Copy } from 'lucide-react';
import { getAppManifestUrl, getAppServiceWorkerUrl } from '@/lib/pwa-assets';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallButtonProps {
  appId: string;
  assetVersion?: string;
  manifestHref?: string;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallButton({ appId, assetVersion = '1', manifestHref }: InstallButtonProps) {
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode);
  const [isLoading, setIsLoading] = useState(() => !isStandaloneMode());
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
  const isMobileDevice = isIOS || isAndroid;
  const isDesktop = !isMobileDevice;

  useEffect(() => {
    // When already in standalone mode, no prompt is needed.
    if (isStandaloneMode()) {
      return;
    }

    // Ensure generated pages expose only the generated app manifest.
    const resolvedManifestHref = manifestHref || getAppManifestUrl(appId, assetVersion);
    const existingManifestLinks = Array.from(document.querySelectorAll('link[rel="manifest"]')) as HTMLLinkElement[];
    existingManifestLinks.forEach((link) => link.remove());

    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = resolvedManifestHref;
    manifestLink.setAttribute('data-app-manifest', 'true');
    document.head.appendChild(manifestLink);

    const hostNameMeta = document.querySelector('meta[name="application-name"]');
    if (hostNameMeta) {
      hostNameMeta.setAttribute('content', '');
    }

    const unregisterHostServiceWorkers = async () => {
      if (!('serviceWorker' in navigator)) return;

      const currentController = navigator.serviceWorker.controller?.scriptURL || '';
      const isHostController = currentController.includes('/sw.js') && !currentController.includes(`/pwa/${appId}/sw.js`);
      const registrations = await navigator.serviceWorker.getRegistrations();
      const shouldRemove = (scriptUrl: string) => {
        try {
          const pathname = new URL(scriptUrl).pathname;
          if (pathname.includes(`/pwa/${appId}/sw.js`)) {
            return false;
          }
          return pathname === '/sw.js' || pathname.includes('/app/sw.js') || pathname.includes('/[locale]/app/sw.js');
        } catch {
          return false;
        }
      };

      const unregisterTasks = registrations
        .filter((registration) => {
          const scriptUrl =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            '';
          return scriptUrl.length > 0 && shouldRemove(scriptUrl);
        })
        .map((registration) => registration.unregister());

      if (unregisterTasks.length > 0) {
        await Promise.allSettled(unregisterTasks);
      }

      if (isHostController) {
        const reloadKey = `generated-sw-reset-${appId}`;
        if (sessionStorage.getItem(reloadKey) !== '1') {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
          return;
        }
      }

      sessionStorage.removeItem(`generated-sw-reset-${appId}`);
    };

    const logInstallContext = () => {
      const controllerScript = navigator.serviceWorker.controller?.scriptURL || 'none';
      const activeManifest = (document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null)?.href || 'none';
      console.log('[InstallContext]', {
        href: window.location.href,
        origin: window.location.origin,
        manifestHref: activeManifest,
        controllerScript,
      });
    };

    // Register an app-specific service worker scoped to the current public app route.
    if ('serviceWorker' in navigator) {
      const scope = window.location.pathname;
      const swUrl = getAppServiceWorkerUrl(appId, assetVersion, scope);
      unregisterHostServiceWorkers()
        .then(() => navigator.serviceWorker.register(swUrl, { scope }))
        .then((registration) => {
          console.log('App SW registered:', registration.scope);
          logInstallContext();
        })
        .catch((err) => {
          console.warn('App SW registration failed:', err);
        });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      logInstallContext();
      setIsLoading(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      deferredPrompt.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Set loading to false after a timeout if no prompt received
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timeout);
    };
  }, [appId, assetVersion, isMobileDevice, manifestHref]);

  const handleInstall = async () => {
    // Track install click (fire and forget)
    try {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, eventType: 'INSTALL_CLICK' }),
      }).catch(() => {});
    } catch { /* ignore */ }

    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      deferredPrompt.current = null;
      setShowHelp(false);
    } else {
      // Browsers block fully automatic install without a native prompt.
      // Show non-blocking help with next steps and shortcuts.
      setShowHelp(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  const guideImageSrc = isIOS
    ? '/images/install-guides/ios-install.svg'
    : isAndroid
      ? '/images/install-guides/android-install.svg'
      : '/images/install-guides/desktop-install.svg';

  if (isInstalled) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white"
      >
        <Check className="-ml-1 mr-2 h-4 w-4" />
        Installed
      </button>
    );
  }

  if (isLoading) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center rounded-md bg-primary/50 px-4 py-2 text-sm font-medium text-white"
      >
        <Loader2 className="-ml-1 mr-2 h-4 w-4 animate-spin" />
        Setting up...
      </button>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <button
        onClick={handleInstall}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Download className="-ml-1 mr-2 h-4 w-4" />
        {isDesktop ? 'Install App on Desktop' : isMobileDevice ? 'Install App' : 'Install'}
      </button>

      {showHelp && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Install steps
          </p>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <Image
              src={guideImageSrc}
              alt="Install guide"
              width={640}
              height={360}
              className="h-auto w-full"
            />
          </div>

          {isIOS ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              <li>Tap the Share button in Safari.</li>
              <li>Select Add to Home Screen.</li>
              <li>Tap Add.</li>
            </ol>
          ) : isAndroid ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              <li>Open browser menu (three dots).</li>
              <li>Select Install app or Add to Home screen.</li>
              <li>Confirm installation.</li>
            </ol>
          ) : (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              <li>Click browser menu (three dots) at top-right.</li>
              <li>Select Install App.</li>
              <li>If available, you can also click the install icon in the address bar.</li>
            </ol>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleOpenNewTab}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in New Tab
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {copied ? 'Link Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
