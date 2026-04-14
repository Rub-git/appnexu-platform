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
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setIsLoading(false);
      return;
    }

    // Remove ALL existing manifests to prevent the browser from reading the platform's default manifest
    const existingManifests = document.querySelectorAll('link[rel="manifest"]');
    existingManifests.forEach(m => m.remove());

    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = `/pwa/${appId}/manifest.json`;
    manifestLink.setAttribute('data-app-manifest', 'true');
    document.head.appendChild(manifestLink);

    // Register app-specific service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`/pwa/${appId}/sw.js`, { scope: '/app/' })
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
      if (isIOS) {
        alert(
          'To install on iOS:\n' +
          '1. Tap the Share button\n' +
          '2. Select "Add to Home Screen"\n' +
          '3. Tap "Add"'
        );
      } else {
        alert(
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
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <Download className="-ml-1 mr-2 h-4 w-4" />
      Install App
    </button>
  );
}
