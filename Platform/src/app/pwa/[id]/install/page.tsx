import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import InstallButton from '@/components/InstallButton';
import PwaScopeIsolation from '@/components/PwaScopeIsolation';
import PwaInstallDiagnostics from '@/components/PwaInstallDiagnostics';
import { getAppAssetVersion, getAppIconUrl, getAppManifestUrl } from '@/lib/pwa-assets';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const app = await prisma.appProject.findUnique({ where: { id } });
  if (!app) return {};

  const assetVersion = getAppAssetVersion(app);

  return {
    title: app.appName,
    description: `${app.appName} - Installable app for ${app.targetUrl}`,
    applicationName: app.appName,
    manifest: getAppManifestUrl(app.id, assetVersion),
  };
}

export default async function PwaInstallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await prisma.appProject.findUnique({
    where: { id },
    select: {
      id: true,
      appName: true,
      targetUrl: true,
      status: true,
      updatedAt: true,
      lastGeneratedAt: true,
      iconUrls: true,
    },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  const assetVersion = getAppAssetVersion(app);
  const manifestHref = getAppManifestUrl(app.id, assetVersion);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-black">
      <PwaScopeIsolation appId={app.id} assetVersion={assetVersion} />
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl shadow ring-1 ring-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getAppIconUrl(app.id, 192, assetVersion)}
            alt={`${app.appName} icon`}
            className="h-full w-full object-cover"
          />
        </div>

        <h1 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">{app.appName}</h1>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">{app.targetUrl}</p>

        <div className="mt-6">
          <InstallButton appId={app.id} assetVersion={assetVersion} manifestHref={manifestHref} />
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Instala desde esta ruta dedicada dentro del scope /pwa/{app.id}/.
        </p>
      </div>
      <PwaInstallDiagnostics appId={app.id} manifestHref={manifestHref} />
    </main>
  );
}
