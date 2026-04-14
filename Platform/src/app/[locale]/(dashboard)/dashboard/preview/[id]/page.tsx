import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Check, ExternalLink, Settings2, BarChart3 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import PublishButton from '@/components/PublishButton';
import CustomDomainForm from '@/components/CustomDomainForm';
import AiSuggestionsPanel from '@/components/AiSuggestionsPanel';
import ApkExportButton from '@/components/ApkExportButton';

export default async function AppPreviewPage({ 
  params 
}: { 
  params: Promise<{ id: string; locale: string }> 
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations();

  // Fetch app and verify ownership with try/catch to prevent 500 errors on invalid IDs
  let app;
  try {
    app = await prisma.appProject.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Preview error:", error);
    return notFound();
  }

  if (!app) {
    return notFound();
  }

  // Verify ownership
  if (app.userId !== session.user.id) {
    return notFound();
  }

  // Build a parsedConfig-like object from the actual DB fields
  const parsedConfig: Record<string, any> = {
    theme: {
      color: app.themeColor || '#178BFF',
      backgroundColor: app.backgroundColor || '#ffffff',
    },
  };

  try {
    const icons = app.iconUrls ? app.iconUrls.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    return (
      <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link 
            href="/dashboard" 
            className="mb-2 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('preview.backToApps')}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {app.appName}
          </h1>
          <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
            {t('preview.source')}: 
            <a 
              href={app.targetUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="ml-1 flex items-center text-primary hover:underline"
            >
              {app.targetUrl} <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {app.status === 'PUBLISHED' && (
            <Link
              href={`/dashboard/apps/${app.id}/analytics`}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <BarChart3 className="-ml-1 mr-2 h-4 w-4" />
              {t('analytics.viewAnalytics')}
            </Link>
          )}
          <Link
            href={`/dashboard/edit/${app.id}`}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Settings2 className="-ml-1 mr-2 h-4 w-4" />
            {t('preview.configure')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Col: Details & Checklist */}
        <div className="space-y-6 lg:col-span-2">
          <AiSuggestionsPanel
            appId={app.id}
            currentName={app.appName}
            onApplySuggestions={async (updates) => {
              "use server";
              const { prisma } = await import('@/lib/prisma');
              const { revalidatePath } = await import('next/cache');
              await prisma.appProject.update({
                where: { id: app.id },
                data: updates
              });
              revalidatePath('/[locale]/(dashboard)/dashboard/preview/[id]', 'page');
            }}
          />

          {/* Details Card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {t('preview.config.title')}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                {t('preview.config.subtitle')}
              </p>
            </div>
            <div className="px-6 py-5">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('preview.config.appName')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {app.appName}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('preview.config.shortName')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {app.shortName || app.appName}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('preview.config.themeColor')}
                  </dt>
                  <dd className="mt-1 flex items-center text-sm text-gray-900 dark:text-white">
                    <span 
                      className="mr-2 h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700" 
                      style={{ backgroundColor: parsedConfig?.theme?.color || app.themeColor || '#ffffff' }}
                    />
                    {parsedConfig?.theme?.color || app.themeColor || '#ffffff'}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('preview.config.backgroundColor')}
                  </dt>
                  <dd className="mt-1 flex items-center text-sm text-gray-900 dark:text-white">
                    <span 
                      className="mr-2 h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700" 
                      style={{ backgroundColor: parsedConfig?.theme?.backgroundColor || app.backgroundColor || '#ffffff' }}
                    />
                    {parsedConfig?.theme?.backgroundColor || app.backgroundColor || '#ffffff'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('preview.config.appIcons')}
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-4">
                    {icons.length > 0 ? (
                      icons.map((icon: string, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={icon} 
                            alt={`Icon ${i + 1}`} 
                            className="h-12 w-12 rounded-xl border border-gray-200 object-cover shadow-sm bg-gray-50 dark:border-gray-700 dark:bg-gray-800" 
                          />
                        </div>
                      ))
                    ) : (
                      <span className="text-sm italic text-gray-400">
                        {t('preview.config.noIcons')}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Checklist Card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {t('preview.readiness.title')}
              </h3>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              <li className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center">
                  <Check className="mr-3 h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('preview.readiness.https')}
                  </span>
                </div>
              </li>
              <li className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center">
                  <Check className="mr-3 h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('preview.readiness.manifest')}
                  </span>
                </div>
              </li>
              <li className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center">
                  <Check className="mr-3 h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('preview.readiness.serviceWorker')}
                  </span>
                </div>
              </li>
              <li className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center">
                  <Check className="mr-3 h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('preview.readiness.icons')}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>

          {/* Publishing Card */}
          <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {t('publish.title')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('publish.subtitle')}
              </p>
            </div>
            <div className="px-6 py-5">
              <PublishButton
                appId={app.id}
                appName={app.appName}
                currentStatus={app.status}
                slug={app.slug}
                failureReason={app.failureReason}
              />
              {app.status === 'PUBLISHED' && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('publish.publicUrl')}: <a href={`/app/${app.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">/app/{app.slug}</a>
                </p>
              )}
            </div>
          </div>

          {/* APK Export Card */}
          <ApkExportButton appId={app.id} appStatus={app.status} />

          {/* Custom Domain Card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="px-6 py-5">
              <CustomDomainForm appId={app.id} currentDomain={app.customDomain} />
            </div>
          </div>

        {/* Right Col: Device Preview */}
        <div className="flex flex-col items-center">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('preview.mobilePreview')}
          </h3>

          {/* iPhone Mockup */}
          <div className="relative mx-auto h-[600px] w-[300px] rounded-[3rem] border-[8px] border-gray-900 bg-gray-900 shadow-xl dark:border-gray-800 dark:bg-gray-800">
            <div className="absolute left-1/2 top-0 z-20 h-[24px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-gray-900 dark:bg-gray-800" />
            <div className="relative h-full w-full overflow-hidden rounded-[2.25rem] bg-white dark:bg-black">
              <div
                className="h-12 w-full pt-2 text-center text-[10px] font-medium text-white shadow-sm flex items-end justify-center pb-1"
                style={{ backgroundColor: app.themeColor || '#178BFF' }}
              >
                <span className="opacity-80">9:41</span>
              </div>
              <div className="h-[calc(100%-3rem)] w-full bg-white dark:bg-black">
                <iframe
                  src={app.targetUrl}
                  className="h-full w-full border-0"
                  title={`${app.appName} Preview`}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    );
  } catch (error) {
    console.error("Render preview error:", error);
    return notFound();
  }
}
