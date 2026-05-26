'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Download, Check, Loader2, ExternalLink, Copy } from 'lucide-react';
import { getAppManifestUrl } from '@/lib/pwa-assets';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallButtonProps {
  appId: string;
  assetVersion?: string;
  manifestHref?: string;
  finalInstallUrl?: string;
  /** When true, enable install mode even on the platform host (e.g. /es/app/[slug] pages). */
  allowInstall?: boolean;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isPlatformHost(hostname: string): boolean {
  const cleanHost = hostname.toLowerCase();
  const configuredHost = (process.env.NEXT_PUBLIC_APP_DOMAIN || '').toLowerCase();

  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') return true;
  if (configuredHost && (cleanHost === configuredHost || cleanHost.endsWith(`.${configuredHost}`))) return true;
  if (cleanHost.endsWith('.vercel.app')) return true;

  // Hardcoded platform domains so isPlatformHost works even when
  // NEXT_PUBLIC_APP_DOMAIN is not set in the environment.
  const platformDomains = ['appnexu.com', 'www.appnexu.com'];
  if (platformDomains.includes(cleanHost)) return true;

  return false;
}

export default function InstallButton({ appId, assetVersion = '1', manifestHref, finalInstallUrl, allowInstall = false }: InstallButtonProps) {
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [isLoading, setIsLoading] = useState(() => !isStandaloneMode());
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deviceType] = useState<'ios' | 'android' | 'desktop'>(() => {
    if (typeof navigator === 'undefined') return 'desktop';
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    return 'desktop';
  });
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const isIOS = deviceType === 'ios';
  const isAndroid = deviceType === 'android';
  const isMobileDevice = isIOS || isAndroid;
  const isDesktop = !isMobileDevice;
  // When allowInstall is true (e.g. public /es/app/[slug] page), treat as
  // installable even on the platform host so manifest + SW are set up.
  const [isCustomHost] = useState<boolean>(() => {
    if (allowInstall) return true;
    if (typeof window === 'undefined') return false;
    return !isPlatformHost(window.location.hostname);
  });

  useEffect(() => {
    const customHost = isCustomHost;

    // When already in standalone mode, no prompt is needed.
    if (isStandaloneMode()) {
      return;
    }

    const existingManifestLinks = Array.from(document.querySelectorAll('link[rel="manifest"]')) as HTMLLinkElement[];
    existingManifestLinks.forEach((link) => link.remove());

    // Preview hosts must not be installable. Installation should happen from
    // the final same-origin domain where manifest and SW live at host root.
    if (customHost) {
      const resolvedManifestHref = manifestHref || getAppManifestUrl(appId, assetVersion);
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = resolvedManifestHref;
      manifestLink.setAttribute('data-app-manifest', 'true');
      document.head.appendChild(manifestLink);
    }

    const hostNameMeta = document.querySelector('meta[name="application-name"]');
    if (hostNameMeta) {
      hostNameMeta.setAttribute('content', '');
    }

    const unregisterHostServiceWorkers = async (expectedScriptPath: string) => {
      if (!('serviceWorker' in navigator)) return;

      const currentController = navigator.serviceWorker.controller?.scriptURL || '';
      const isUnexpectedController = (() => {
        try {
          if (!currentController) return false;
          const currentPath = new URL(currentController).pathname;
          return currentPath !== expectedScriptPath;
        } catch {
          return false;
        }
      })();
      const registrations = await navigator.serviceWorker.getRegistrations();
      const shouldRemove = (scriptUrl: string) => {
        try {
          const pathname = new URL(scriptUrl).pathname;
          return pathname !== expectedScriptPath && (
            pathname === '/sw.js' ||
            pathname.includes('/app/sw.js') ||
            pathname.includes('/[locale]/app/sw.js') ||
            pathname.includes(`/pwa/${appId}/sw.js`)
          );
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

      if (isUnexpectedController) {
        const reloadKey = `generated-sw-reset-${appId}`;
        if (sessionStorage.getItem(reloadKey) !== '1') {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
          return;
        }
      }

      sessionStorage.removeItem(`generated-sw-reset-${appId}`);
    };

    const logInstallContext = async (reason: string) => {
      const controllerScript = navigator.serviceWorker.controller?.scriptURL || 'none';
      const activeManifest = (document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null)?.href || 'none';
      const registrations = 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistrations()
        : [];

      console.log('[PWA-Debug] document.querySelector(manifest)?.href', activeManifest);
      console.log('[PWA-Debug] navigator.serviceWorker.getRegistrations()', registrations.map((registration) => ({
        scope: registration.scope,
        active: registration.active?.scriptURL || null,
        waiting: registration.waiting?.scriptURL || null,
        installing: registration.installing?.scriptURL || null,
      })));
      console.log('[PWA-Debug] location.href', window.location.href);
      console.log('[PWA-Debug] display-mode standalone', isStandaloneMode());

      console.log('[InstallContext]', {
        reason,
        href: window.location.href,
        origin: window.location.origin,
        manifestHref: activeManifest,
        controllerScript,
      });
    };

    // Register SW when on a custom/final host, or when allowInstall forces
    // install mode on the platform host (public app pages).
    if (customHost && 'serviceWorker' in navigator) {
      // On custom domains the app SW lives at /sw.js with root scope.
      // On platform host with allowInstall, use the app-specific SW path
      // so it doesn't conflict with the platform's own /sw.js.
      const isPlatform = typeof window !== 'undefined' && isPlatformHost(window.location.hostname);
      const scope = isPlatform ? `/pwa/${appId}/` : '/';
      const swUrl = isPlatform ? `/pwa/${appId}/sw.js` : '/sw.js';
      const expectedScriptPath = isPlatform ? `/pwa/${appId}/sw.js` : '/sw.js';
      unregisterHostServiceWorkers(expectedScriptPath)
        .then(() => navigator.serviceWorker.register(swUrl, { scope }))
        .then((registration) => {
          console.log('App SW registered:', registration.scope);
          void logInstallContext('service-worker-registered');
        })
        .catch((err) => {
          console.warn('App SW registration failed:', err);
        });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      console.log('[PWA-Debug] beforeinstallprompt fired');
      void logInstallContext('beforeinstallprompt');
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
      if (!deferredPrompt.current && !isInstalled) {
        setShowHelp(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timeout);
    };
  }, [appId, assetVersion, manifestHref, isCustomHost, isInstalled]);

  const handleInstall = async () => {
    if (!isCustomHost) {
      if (finalInstallUrl) {
        window.location.href = finalInstallUrl;
      }
      return;
    }

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
        {!isCustomHost
          ? 'Abrir dominio final para instalar'
          : isDesktop
            ? 'Instalar App'
            : isMobileDevice
              ? 'Instalar App'
              : 'Instalar'}
      </button>

      {showHelp && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Pasos para instalar
          </p>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <Image
              src={guideImageSrc}
              alt="Guía de instalación"
              width={640}
              height={360}
              className="h-auto w-full"
            />
          </div>

          {isIOS ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              <li>Toca el botón Compartir en Safari.</li>
              <li>Selecciona Agregar a la pantalla de inicio.</li>
              <li>Toca Agregar.</li>
            </ol>
          ) : isAndroid ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              <li>Abre el menú del navegador (tres puntos).</li>
              <li>Selecciona Instalar app o Agregar a pantalla de inicio.</li>
              <li>Confirma la instalación.</li>
            </ol>
          ) : (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              <li>Haz clic en el menú del navegador (tres puntos) arriba a la derecha.</li>
              <li>Selecciona Instalar App.</li>
              <li>Si está disponible, también puedes hacer clic en el icono de instalación en la barra de direcciones.</li>
            </ol>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleOpenNewTab}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Abrir en nueva pestaña
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {copied ? 'Enlace copiado' : 'Copiar enlace'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
