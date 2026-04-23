'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        // Only run in the browser
        if (typeof window === 'undefined') return;

        const path = window.location.pathname;
        const isPublicAppRoute =
            /^\/app\//.test(path) ||
            /^\/[a-z]{2}\/app\//i.test(path) ||
            /^\/app\/_domain\//.test(path);

        if (isPublicAppRoute) {
            // Public generated app routes must be controlled only by their app-specific SW.
            console.log('[Main] On public app route, skipping main SW registration');
            return;
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            // Check if viewing a specific app preview (those have their own SW)
            const isAppPreview = window.location.pathname.includes('/dashboard/preview/');
            
            if (isAppPreview) {
                // Don't register main SW on app preview pages
                // The InstallButton component handles app-specific SW
                console.log('[Main] On app preview page, skipping main SW registration');
                return;
            }

            // Register main service worker for dashboard
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('[Main] Service Worker registered with scope:', registration.scope);

                        // Check for updates periodically
                        setInterval(() => {
                            registration.update();
                        }, 60 * 60 * 1000); // Check every hour

                        // Handle updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        // New content is available, show update notification
                                        console.log('[Main] New content available, refresh to update');
                                        // Could show a toast notification here
                                    }
                                });
                            }
                        });
                    })
                    .catch((error) => {
                        console.error('[Main] Service Worker registration failed:', error);
                    });

                // Listen for controller changes (new SW taking over)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[Main] Service Worker controller changed');
                });
            });
        }
    }, []);

    return null;
}
