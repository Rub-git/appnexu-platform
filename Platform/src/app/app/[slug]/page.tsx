import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import InstallButton from '@/components/InstallButton';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import { Globe } from 'lucide-react';
import { getAppAssetVersion, getAppIconUrl, getAppManifestUrl } from '@/lib/pwa-assets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const app = await prisma.appProject.findUnique({ where: { slug } });
  if (!app) return {};
  const assetVersion = getAppAssetVersion(app);

  return {
    title: app.appName,
    description: `${app.appName} - Installable app for ${app.targetUrl}`,
    applicationName: app.appName,
    manifest: getAppManifestUrl(app.id, assetVersion),
    appleWebApp: {
      capable: true,
      title: app.appName,
      statusBarStyle: 'default',
    },
    icons: {
      icon: [
        {
          url: getAppIconUrl(app.id, 192, assetVersion),
          sizes: '192x192',
          type: 'image/png',
        },
        {
          url: getAppIconUrl(app.id, 512, assetVersion),
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      apple: [
        {
          url: getAppIconUrl(app.id, 180, assetVersion),
          sizes: '180x180',
          type: 'image/png',
        },
      ],
    },
    openGraph: {
      title: app.appName,
      description: `${app.appName} - Installable app`,
      url: app.targetUrl,
      type: 'website',
      images: [
        {
          url: getAppIconUrl(app.id, 512, assetVersion),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: app.appName,
      description: `${app.appName} - Installable app`,
      images: [getAppIconUrl(app.id, 512, assetVersion)],
    },
  };
}

export default async function PublicAppPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const isPwa = resolvedSearchParams?.pwa === 'true';
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get('user-agent') || '';
  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

  console.log('PublicAppPage requested slug:', slug);

  // Find app by slug - only show PUBLISHED apps publicly
  const app = await prisma.appProject.findUnique({
    where: { slug },
  });

  console.log('PublicAppPage app found:', app?.id, 'status:', app?.status);

  if (!app) {
    notFound();
  }

  // Only show published apps to the public
  if (app.status !== 'PUBLISHED') {
    notFound();
  }

  if (isPwa && !isMobileDevice) {
    redirect(app.targetUrl);
  }

  const assetVersion = getAppAssetVersion(app);
  
  if (isPwa) {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden bg-white dark:bg-black">
        {/* Analytics Tracking */}
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
      {/* Analytics Tracking */}
      <AnalyticsTracker appId={app.id} />

      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          {/* App Icon */}
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAppIconUrl(app.id, 192, assetVersion)}
              alt={`${app.appName} icon`}
              className="h-full w-full object-cover"
            />
          </div>

          {/* App Name */}
          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {app.appName}
          </h1>

          {/* URL */}
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {app.targetUrl}
          </p>

          {/* Custom Domain Badge */}
          {app.customDomain && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <Globe size={12} />
              {app.customDomain}
            </div>
          )}

          {/* Install Button */}
          <div className="mt-8">
            <InstallButton appId={app.id} assetVersion={assetVersion} />
          </div>

          {/* Preview */}
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
