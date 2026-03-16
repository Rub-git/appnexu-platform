'use client';

import { useEffect } from 'react';

interface AnalyticsTrackerProps {
  appId: string;
  eventType?: 'PAGE_VIEW' | 'INSTALL_CLICK';
}

/**
 * Client-side analytics tracker component.
 * Fires a PAGE_VIEW event on mount for published app pages.
 * Lightweight and non-blocking.
 */
export default function AnalyticsTracker({ appId, eventType = 'PAGE_VIEW' }: AnalyticsTrackerProps) {
  useEffect(() => {
    // Fire and forget - don't block rendering
    const trackPageView = async () => {
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId,
            eventType,
            referrer: document.referrer || undefined,
          }),
        });
      } catch {
        // Silently fail - analytics should never break the app
      }
    };

    trackPageView();
  }, [appId, eventType]);

  return null; // Invisible component
}

/**
 * Track an install click event.
 * Call this function when the user clicks the install button.
 */
export async function trackInstallClick(appId: string): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId,
        eventType: 'INSTALL_CLICK',
      }),
    });
  } catch {
    // Silently fail
  }
}
