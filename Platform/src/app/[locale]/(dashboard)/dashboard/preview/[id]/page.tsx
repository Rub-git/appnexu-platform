import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, BarChart3, ExternalLink, Smartphone } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { getAppIconUrl, getAppAssetVersion } from '@/lib/pwa-assets';
import { getNormalizedHostnameFromUrl, normalizeCustomDomain } from '@/lib/custom-domain';
import PublishButton from '@/components/PublishButton';
import CustomDomainForm from '@/components/CustomDomainForm';
import AiSuggestionsPanel from '@/components/AiSuggestionsPanel';
import ApkExportButton from '@/components/ApkExportButton';
import PhoneMockupIframe from '@/components/PhoneMockupIframe';
import PwaAuditChecklist from '@/components/PwaAuditChecklist';
import PublicUrlActions from '@/components/PublicUrlActions';
import AppBasicSettingsCard from '@/components/AppBasicSettingsCard';
import OnboardingWizardBar from '@/components/OnboardingWizardBar';
import QrCodeCard from '@/components/QrCodeCard';
import PublishedSuccessCard from '@/components/PublishedSuccessCard';
import { FUTURE_SAAS_MODULES } from '@/lib/future-modules';

function getStatusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'PUBLISHED':
      return {
        label: 'Publicada',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      };
    case 'FAILED':
      return {
        label: 'Requiere atencion',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    case 'QUEUED':
    case 'GENERATING':
      return {
        label: 'En proceso',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      };
    default:
      return {
        label: 'Lista',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      };
  }
}

function clampWizardStep(value: string | string[] | undefined): 3 | 4 | 5 {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw || '3', 10);
  if (parsed <= 3) return 3;
  if (parsed >= 5) return 5;
  return 4;
}

export default async function AppPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ step?: string; wizard?: string }>;
}) {
  const { id, locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations();

  let app;
  try {
    app = await prisma.appProject.findUnique({
      where: { id },
    });
  } catch {
    return notFound();
  }

  if (!app || app.userId !== session.user.id) {
    return notFound();
  }

  const assetVersion = getAppAssetVersion(app);
  const normalizedCustomDomain = app.customDomain ? normalizeCustomDomain(app.customDomain) : null;
  const targetHost = getNormalizedHostnameFromUrl(app.targetUrl);
  const isSelfReferentialDomain = Boolean(
    normalizedCustomDomain && targetHost && normalizedCustomDomain === targetHost,
  );
  const shouldUseCustomDomainRoot =
    Boolean(normalizedCustomDomain) &&
    app.status === 'PUBLISHED' &&
    !isSelfReferentialDomain;

  const mockPreviewUrl = isSelfReferentialDomain
    ? `/app/${app.slug}`
    : shouldUseCustomDomainRoot
      ? `https://${normalizedCustomDomain}`
      : app.targetUrl;

  const publicUrl = app.customDomain
    ? `https://${app.customDomain}`
    : `/${locale}/app/${app.slug}`;

  const appConfigured = Boolean(
    app.appName?.trim() &&
    (app.shortName || app.appName)?.trim() &&
    (app.themeColor || '#178BFF') &&
    (app.backgroundColor || '#ffffff')
  );

  const statusMeta = getStatusMeta(app.status);
  const wizardStep = clampWizardStep(query.step);
  const steps = [
    { id: 1, label: 'Ingresa tu website' },
    { id: 2, label: 'IA analiza tu sitio' },
    { id: 3, label: 'Personaliza tu app' },
    { id: 4, label: 'Vista previa' },
    { id: 5, label: 'Publica' },
  ];

  const prevStep = wizardStep > 3 ? wizardStep - 1 : 3;
  const nextStep = wizardStep < 5 ? wizardStep + 1 : 5;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <OnboardingWizardBar currentStep={wizardStep} steps={steps} />

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('preview.backToApps')}
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Tu app esta casi lista</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{app.appName}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              URL fuente:
              <a href={app.targetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                {app.targetUrl}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Estado general:
              <span className={`ml-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {app.status === 'PUBLISHED' ? (
              <Link
                href={`/dashboard/apps/${app.id}/analytics`}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                {t('analytics.viewAnalytics')}
              </Link>
            ) : null}
            <Link
              href={`/dashboard/edit/${app.id}`}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              Editar en detalle
            </Link>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Link
            href={`/dashboard/preview/${app.id}?wizard=1&step=${prevStep}`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Anterior
          </Link>
          <Link
            href={`/dashboard/preview/${app.id}?wizard=1&step=${nextStep}`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Siguiente
            <ExternalLink className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </section>

      {wizardStep === 3 ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <AiSuggestionsPanel appId={app.id} currentName={app.appName} />

            <AppBasicSettingsCard
              app={{
                id: app.id,
                appName: app.appName,
                shortName: app.shortName,
                themeColor: app.themeColor,
                backgroundColor: app.backgroundColor,
                iconUrls: app.iconUrls,
                importedStartUrl: app.importedStartUrl,
              }}
              enableAutosave
            />

            <PwaAuditChecklist
              appId={app.id}
              customDomain={app.customDomain}
              appConfigured={appConfigured}
              appStatus={app.status}
            />
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <div className="px-6 py-5">
                <CustomDomainForm appId={app.id} currentDomain={app.customDomain} />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Arquitectura premium preparada</h3>
              </div>
              <div className="grid gap-2 px-6 py-4">
                {FUTURE_SAAS_MODULES.map((module) => (
                  <div key={module.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{module.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{module.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {wizardStep === 4 ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vista previa movil</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Simulacion tipo app con splash, transiciones y standalone visual.</p>
            </div>
            <div className="flex justify-center px-6 py-6">
              <div className="relative h-[620px] w-[310px] rounded-[3rem] border-[8px] border-gray-900 bg-gray-900 shadow-xl dark:border-gray-800 dark:bg-gray-800">
                <div className="absolute left-1/2 top-0 z-20 h-[24px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-gray-900 dark:bg-gray-800" />
                <div className="relative h-full w-full overflow-hidden rounded-[2.25rem] bg-white dark:bg-black">
                  <PhoneMockupIframe
                    src={mockPreviewUrl}
                    title={`${app.appName} Preview`}
                    themeColor={app.themeColor || '#178BFF'}
                    appName={app.appName}
                    iconUrl={getAppIconUrl(app.id, 192, assetVersion)}
                    showBottomBar
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Probar en movil</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Escanea el QR o abre la URL para probar instantaneamente.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Smartphone className="h-4 w-4" />
                  Ver en movil
                </a>
              </div>
            </section>

            <QrCodeCard
              value={publicUrl}
              title="QR para probar"
              subtitle="Abre la app en tu telefono sin friccion"
            />
          </div>
        </div>
      ) : null}

      {wizardStep === 5 ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Publicacion</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Estado: {app.status === 'PUBLISHED' ? 'Publicada' : 'No publicada'}
                </p>
              </div>

              <div className="space-y-4 px-6 py-5">
                <PublishButton
                  appId={app.id}
                  appName={app.appName}
                  currentStatus={app.status}
                  slug={app.slug}
                  failureReason={app.failureReason}
                />

                {app.status === 'PUBLISHED' ? (
                  <>
                    <PublishedSuccessCard publicUrl={publicUrl} />
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        URL publica:{' '}
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                          {publicUrl}
                        </a>
                      </p>
                      <div className="mt-3">
                        <PublicUrlActions publicUrl={publicUrl} />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <ApkExportButton appId={app.id} appStatus={app.status} />
          </div>

          <div className="space-y-6">
            {app.status === 'PUBLISHED' ? (
              <>
                <QrCodeCard
                  value={publicUrl}
                  title="QR instalable"
                  subtitle="Escanea para instalar rapido en Android/iOS"
                />
                <QrCodeCard
                  value={publicUrl}
                  title="QR para compartir"
                  subtitle="Ideal para campañas y material comercial"
                />
              </>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Instalacion guiada</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p><strong>Android:</strong> Abrir URL, menu de Chrome, Instalar app.</p>
                  <p><strong>iPhone:</strong> Abrir en Safari, Compartir, Anadir a pantalla de inicio.</p>
                  <p><strong>Desktop Chrome:</strong> Abrir URL, icono de instalacion en la barra.</p>
                </div>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
