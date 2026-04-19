import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import InstallButton from '@/components/InstallButton';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import { Smartphone, Globe } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const app = await prisma.appProject.findUnique({ where: { slug } });
  if (!app) return {};

  const iconUrls = app.iconUrls ? app.iconUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
  const primaryIcon = iconUrls.length > 0 ? iconUrls[0] : '/icons/icon-192.png';

  const pathname = `/${locale}/app/${slug}`;
  const scope = `/${locale}/app/`;
  return {
    title: app.appName,
    manifest: `/pwa/${app.id}/manifest.json?start_url=${encodeURIComponent(pathname)}&scope=${encodeURIComponent(scope)}`,
    appleWebApp: {
      capable: true,
      title: app.appName,
      statusBarStyle: 'default',
    },
    icons: {
      apple: primaryIcon,
    },
  };
}

export default async function PublicAppPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const isPwa = resolvedSearchParams?.pwa === 'true';
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get('user-agent') || '';
  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

  const app = await prisma.appProject.findUnique({
    where: { slug },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  if (isPwa && !isMobileDevice) {
    redirect(app.targetUrl);
  }

  if (isPwa) {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden bg-white dark:bg-black">
        <AnalyticsTracker appId={app.id} />
        <iframe
          src={app.targetUrl}
          className="h-full w-full border-0"
          title={app.appName}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <AnalyticsTracker appId={app.id} />

      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg text-white"
            style={{ backgroundColor: app.themeColor || '#178BFF' }}
          >
            <Smartphone size={48} />
          </div>

          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {app.appName}
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {app.targetUrl}
          </p>

          {app.customDomain && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <Globe size={12} />
              {app.customDomain}
            </div>
          )}

          <div className="mt-8">
            <InstallButton appId={app.id} targetUrl={app.targetUrl} />
          </div>

          <div className="mt-12">
            <div className="relative mx-auto h-[500px] w-[280px] rounded-[2.5rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl dark:border-gray-700">
              <div className="absolute left-1/2 top-0 z-20 h-[20px] w-[100px] -translate-x-1/2 rounded-b-xl bg-gray-900 dark:bg-gray-700" />
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-white dark:bg-black">
                <iframe
                  src={app.targetUrl}
                  className="h-full w-full border-0"
                  title={app.appName}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
