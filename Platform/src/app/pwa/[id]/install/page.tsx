import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import InstallButton from '@/components/InstallButton';
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
  };
}

export default async function PwaInstallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const isAdminPreview = resolvedSearchParams.admin === '1';

  const app = await prisma.appProject.findUnique({
    where: { id },
    select: {
      id: true,
      appName: true,
      targetUrl: true,
      customDomain: true,
      status: true,
      pwaMode: true,
      importedManifestUrl: true,
      importedSwUrl: true,
      importedStartUrl: true,
      importedScope: true,
      updatedAt: true,
      lastGeneratedAt: true,
      iconUrls: true,
      themeColor: true,
      backgroundColor: true,
    },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  const assetVersion = getAppAssetVersion(app);
  const manifestHref = getAppManifestUrl(app.id, assetVersion);
  const finalInstallUrl = app.customDomain ? `https://${app.customDomain}/` : app.targetUrl;

  if (!isAdminPreview) {
    redirect(finalInstallUrl);
  }

  let expectedScope = '/';
  try {
    expectedScope = `${new URL(app.targetUrl).origin}/`;
  } catch {
    expectedScope = '/';
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-black">
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

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Admin Preview</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{app.appName}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              standalone
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-left text-xs">
            <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Theme color</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: app.themeColor || '#178BFF' }} />
                <span className="font-medium text-gray-900 dark:text-white">{app.themeColor || '#178BFF'}</span>
              </div>
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Background</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: app.backgroundColor || '#ffffff' }} />
                <span className="font-medium text-gray-900 dark:text-white">{app.backgroundColor || '#ffffff'}</span>
              </div>
            </div>
            <div className="col-span-2 rounded-lg bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Manifest source</p>
              <p className="mt-1 break-all font-medium text-gray-900 dark:text-white">{manifestHref}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {app.pwaMode === 'IMPORT' ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
              <p className="font-semibold">Modo Import detectado</p>
              <p className="mt-2">
                Esta app ya tiene PWA propia. Instala desde el sitio original para evitar una PWA duplicada.
              </p>
              <a
                href={app.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Abrir sitio original
              </a>
              <div className="mt-3 space-y-1 text-xs text-blue-800 dark:text-blue-300">
                <p>Manifest: {app.importedManifestUrl || 'No detectado'}</p>
                <p>Service worker: {app.importedSwUrl || 'No detectado'}</p>
                <p>start_url: {app.importedStartUrl || 'No detectado'}</p>
                <p>scope: {app.importedScope || 'No detectado'}</p>
              </div>
            </div>
          ) : (
            <InstallButton
              appId={app.id}
              assetVersion={assetVersion}
              manifestHref={manifestHref}
              finalInstallUrl={finalInstallUrl}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Esta vista es solo de administracion. La app instalada se abre en el sitio real del cliente.
        </p>
      </div>
      <PwaInstallDiagnostics
        appId={app.id}
        manifestHref={manifestHref}
        expectedScope={expectedScope}
        expectedStartUrl={app.targetUrl}
      />
    </main>
  );
}
