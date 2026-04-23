import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { brand } from '@/config/brand';

export const metadata: Metadata = {
  applicationName: brand.name,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: brand.name,
  },
  icons: {
    icon: [
      { url: brand.logo.favicon, sizes: '32x32', type: 'image/x-icon' },
      { url: brand.logo.icon192, sizes: '192x192', type: 'image/png' },
      { url: brand.logo.icon512, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: brand.logo.appleTouchIcon, sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}
