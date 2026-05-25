
import './globals.css'
import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Forzar actualización del SW tras deploy
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            registration.waiting.addEventListener('statechange', (e) => {
              // Cuando el SW se activa, recarga la página
              if ((e.target as ServiceWorker).state === 'activated') {
                window.location.reload();
              }
            });
          }
        });
      });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        {/* Favicon y manifest para máxima compatibilidad */}
        <link rel="icon" href="/favicon.ico?v=20260523b" sizes="32x32" type="image/x-icon" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#178BFF" />
      </head>
      <body>{children}</body>
    </html>
  );
}
