import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Favicon y manifest para máxima compatibilidad */}
        <link rel="icon" href="/favicon.ico?v=20260523b" sizes="32x32" type="image/x-icon" />
        <link rel="icon" href="/icon.png" sizes="any" type="image/png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#178BFF" />
      </head>
      <body>{children}</body>
    </html>
  );
}
