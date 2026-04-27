import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import InstallButton from '@/components/InstallButton';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import { logger } from '@/lib/logger';
import GeneratedAppRuntime from '@/components/GeneratedAppRuntime';
import {
  getAppAssetVersion,
  getAppCachePrefix,
  getAppIconUrl,
  getAppNamedIconUrl,
  getAppManifestUrlForMode,
} from '@/lib/pwa-assets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params;
  const app = await prisma.appProject.findUnique({ where: { customDomain: domain } });
  if (!app) return {};
  const assetVersion = getAppAssetVersion(app);
  const manifestHref = getAppManifestUrlForMode(app.id, assetVersion, 'domain', domain);

  return {
    title: app.appName,
    description: `${app.appName} - Installable app for ${app.targetUrl}`,
    applicationName: app.appName,
    manifest: manifestHref,
    appleWebApp: { capable: true, title: app.appName, statusBarStyle: 'default' },
    icons: {
      icon: [
        { url: getAppNamedIconUrl(app.id, 'favicon.ico', assetVersion), type: 'image/x-icon' },
        { url: getAppNamedIconUrl(app.id, 'icon-192.png', assetVersion), sizes: '192x192', type: 'image/png' },
        { url: getAppNamedIconUrl(app.id, 'icon-512.png', assetVersion), sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: getAppNamedIconUrl(app.id, 'apple-touch-icon.png', assetVersion), sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      title: app.appName,
      description: `${app.appName} - Installable app`,
      url: app.targetUrl,
      type: 'website',
      images: [{ url: getAppIconUrl(app.id, 512, assetVersion) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: app.appName,
      description: `${app.appName} - Installable app`,
      images: [getAppIconUrl(app.id, 512, assetVersion)],
    },
  };
}

export default async function CustomDomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { domain } = await params;
  const resolvedSearchParams = await searchParams;
  const isPwa = resolvedSearchParams?.pwa === 'true';
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || '';
  const userAgent = requestHeaders.get('user-agent') || '';

  const app = await prisma.appProject.findUnique({ where: { customDomain: domain } });

  if (!app || app.status !== 'PUBLISHED') {
    logger.warn('live.domain', 'Domain route not found or unpublished', {
      requestDomain: domain,
      host,
      foundAppId: app?.id,
      foundStatus: app?.status,
    });
    notFound();
  }

  logger.info('live.domain', 'Resolved domain live route', {
    requestDomain: domain,
    resolvedAppId: app.id,
    resolvedAppName: app.appName,
    resolvedDomain: app.customDomain,
    targetUrl: app.targetUrl,
    host,
    isPwa,
  });

  if (isPwa) {
    logger.info('live.domain', 'pwa=true staying inside generated app route', {
      appId: app.id,
      host,
    });
  }

  const assetVersion = getAppAssetVersion(app);
  const manifestHref = getAppManifestUrlForMode(app.id, assetVersion, 'domain', domain);
  const cachePrefix = getAppCachePrefix(app.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
      <GeneratedAppRuntime
        appId={app.id}
        slug={app.slug}
        targetUrl={app.targetUrl}
        manifestHref={manifestHref}
        cachePrefix={cachePrefix}
      />
      <AnalyticsTracker appId={app.id} />

      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur sticky top-0 z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getAppIconUrl(app.id, 64, assetVersion)} alt={`${app.appName} icon`} className="h-10 w-10 rounded-xl object-cover shadow ring-1 ring-black/5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{app.appName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.targetUrl.replace(/^https?:\/\//, '')}</p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <InstallButton appId={app.id} assetVersion={assetVersion} manifestHref={manifestHref} />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col lg:flex-row items-center lg:items-start gap-12">
        <div className="flex-shrink-0 flex flex-col items-center gap-4">
          <div className="relative w-[300px] h-[580px] rounded-[40px] bg-gray-900 shadow-2xl ring-1 ring-gray-700 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl z-10" />
            <div className="absolute inset-[10px] rounded-[32px] overflow-hidden bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-950">
              <div className="flex h-full flex-col p-4">
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

                <div className="grid flex-1 grid-cols-2 gap-2">
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
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full" />
          </div>
          <p className="text-xs text-gray-400">Vista previa en vivo</p>
        </div>

        <div className="flex flex-col items-center lg:items-start gap-6 text-center lg:text-left max-w-sm w-full">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAppIconUrl(app.id, 192, assetVersion)} alt={`${app.appName} icon`} className="h-20 w-20 rounded-3xl object-cover shadow-lg ring-1 ring-black/5" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{app.appName}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{app.targetUrl.replace(/^https?:\/\//, '')}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-5 text-left w-full">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">¿Cómo instalar?</p>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <li className="flex items-start gap-2"><span className="font-bold shrink-0">1.</span><span>Toca el botón <strong>Instalar app</strong> de arriba</span></li>
              <li className="flex items-start gap-2"><span className="font-bold shrink-0">2.</span><span>Selecciona <strong>Añadir a pantalla de inicio</strong></span></li>
              <li className="flex items-start gap-2"><span className="font-bold shrink-0">3.</span><span>¡Listo! La app aparecerá en tu dispositivo</span></li>
            </ol>
          </div>

          <a href={app.targetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Abrir sitio web
          </a>
        </div>
      </div>
    </div>
  );
}
