import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import InstallButton from '@/components/InstallButton';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import { Globe } from 'lucide-react';
import { getAppAssetVersion, getAppIconUrl, getAppManifestUrl } from '@/lib/pwa-assets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const app = await prisma.appProject.findUnique({ where: { slug } });
  if (!app) return {};
  const assetVersion = getAppAssetVersion(app);

  if (app.pwaMode === 'IMPORT') {
    return {
      title: app.appName,
      description: `${app.appName} - Existing PWA managed by Appnexu`,
      applicationName: app.appName,
    };
  }

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
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;

  const app = await prisma.appProject.findUnique({
    where: { slug },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  if (app.pwaMode === 'IMPORT') {
    redirect(app.targetUrl);
  }

  const assetVersion = getAppAssetVersion(app);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <AnalyticsTracker appId={app.id} />

      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAppIconUrl(app.id, 192, assetVersion)}
              alt={`${app.appName} icon`}
              className="h-full w-full object-cover"
            />
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
            <InstallButton appId={app.id} assetVersion={assetVersion} />
          </div>

          <div className="mt-12">
            <div className="relative mx-auto h-[500px] w-[280px] rounded-[2.5rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl dark:border-gray-700">
              <div className="absolute left-1/2 top-0 z-20 h-[20px] w-[100px] -translate-x-1/2 rounded-b-xl bg-gray-900 dark:bg-gray-700" />
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-gradient-to-b from-white to-gray-100 p-4 dark:from-gray-900 dark:to-black">
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/90 p-2 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900/80 dark:ring-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAppIconUrl(app.id, 64, assetVersion)}
                    alt={`${app.appName} icon`}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{app.appName}</p>
                    <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">{app.targetUrl.replace(/^https?:\/\//, '')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Inicio</p>
                    <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-white">Pantalla principal</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Estado</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-600">Lista para instalar</p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Enlace</p>
                    <p className="mt-1 truncate text-xs text-gray-900 dark:text-white">{app.targetUrl}</p>
                  </div>
                </div>

                <a
                  href={app.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
                >
                  Abrir sitio web
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
