import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import "../globals.css";
import { brand } from "@/config/brand";
import { SessionProvider } from "@/components/SessionProvider";

export const viewport: Viewport = {
  themeColor: brand.colors.primary,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  applicationName: brand.name,
  title: brand.seo.defaultTitle,
  description: brand.seo.defaultDescription,
  keywords: [...brand.seo.keywords],
  authors: [{ name: brand.name }],
  metadataBase: new URL(brand.seo.canonicalDomain),
  icons: {
    icon: [
      { url: brand.logo.favicon, sizes: '32x32', type: 'image/x-icon' },
      { url: brand.logo.icon192, sizes: '192x192', type: 'image/png' },
      { url: brand.logo.icon512, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: brand.logo.appleTouchIcon, sizes: '180x180', type: 'image/png' },
    ],
  },
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
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            {children}
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
