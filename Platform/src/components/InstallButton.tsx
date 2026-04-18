'use client';

import { useEffect, useState, useRef } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallButtonProps {
  appId: string;
}

export default function InstallButton({ appId }: InstallButtonProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supportsManualInstallHints, setSupportsManualInstallHints] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // If this page is already running in standalone/app mode, treat it as installed.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const manualInstallCapable = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
    setSupportsManualInstallHints(manualInstallCapable);

    if (isStandalone) {
      setIsInstalled(true);
      setIsLoading(false);
      return;
    }

    // Remove ALL existing manifests to prevent the browser from reading the platform's default manifest
    const existingManifests = document.querySelectorAll('link[rel="manifest"]');
    existingManifests.forEach(m => m.remove());

    // Dynamically determine the scope based on the current URL
    // This allows the PWA to work correctly under locales (e.g. /es/app/...) and custom domains.
    const currentPath = window.location.pathname;
    const startUrl = `${currentPath}?pwa=true`;

    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = `/pwa/${appId}/manifest.json?start_url=${encodeURIComponent(startUrl)}&scope=${encodeURIComponent(currentPath)}`;
    manifestLink.setAttribute('data-app-manifest', 'true');
    document.head.appendChild(manifestLink);

    // Register app-specific service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`/pwa/${appId}/sw.js?scope=${encodeURIComponent(currentPath)}`, { scope: currentPath })
        .then((registration) => {
          console.log('App SW registered:', registration.scope);
        })
        .catch((err) => {
          console.warn('App SW registration failed:', err);
        });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
      setIsLoading(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
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
  }, [appId]);

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
      setIsInstallable(false);
    } else {
      // Fallback for iOS and browsers without beforeinstallprompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isIOS) {
        alert(
          'To install on iOS:\n' +
          '1. Tap the Share button\n' +
          '2. Select "Add to Home Screen"\n' +
          '3. Tap "Add"'
        );
      } else if (isAndroid) {
        alert(
          'To install on Android:\n' +
          '1. Open browser menu (three dots)\n' +
          '2. Select "Install app" or "Add to Home screen"\n' +
          '3. Confirm installation'
        );
      } else {
        alert(
          'Automatic install is not available in this browser context.\n\n' +
          'To install this app:\n' +
          '1. Open browser menu (three dots)\n' +
          '2. Select "Install app" or "Add to Home screen"'
        );
      }
    }
  };

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
    <button
      onClick={handleInstall}
      disabled={!isInstallable && !supportsManualInstallHints}
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Download className="-ml-1 mr-2 h-4 w-4" />
      {isInstallable ? 'Install App' : 'Install Help'}
    </button>
  );
}
