import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import "../globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { brand } from "@/config/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: brand.colors.primary,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: brand.seo.defaultTitle,
  description: brand.seo.defaultDescription,
  applicationName: brand.name,
  keywords: [...brand.seo.keywords],
  authors: [{ name: brand.name }],
  manifest: "/manifest.json",
  metadataBase: new URL(brand.seo.canonicalDomain),
  openGraph: {
    title: brand.seo.defaultTitle,
    description: brand.seo.defaultDescription,
    siteName: brand.name,
    images: [{ url: brand.seo.ogImage }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: brand.seo.defaultTitle,
    description: brand.seo.defaultDescription,
    images: [brand.seo.ogImage],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.name,
  },
  icons: {
    icon: [
      { url: brand.logo.favicon, sizes: "32x32", type: "image/x-icon" },
      { url: brand.logo.icon192, sizes: "192x192", type: "image/png" },
      { url: brand.logo.icon512, sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: brand.logo.appleTouchIcon, sizes: "192x192", type: "image/png" },
    ],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming locale is valid
  if (!routing.locales.includes(locale as 'en' | 'es')) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href={brand.logo.favicon} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={brand.name} />
        <link rel="apple-touch-icon" href={brand.logo.appleTouchIcon} />
        <link rel="apple-touch-startup-image" href={brand.logo.icon512} />
        <meta name="msapplication-TileColor" content={brand.colors.primary} />
        <meta name="msapplication-TileImage" content={brand.logo.icon192} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content={brand.name} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ServiceWorkerRegistration />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
