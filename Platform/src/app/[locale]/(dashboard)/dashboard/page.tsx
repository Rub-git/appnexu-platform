import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/routing';
import {
  Plus,
  Smartphone,
  ExternalLink,
  Edit,
  Eye,
  Globe,
  Loader2,
  AlertTriangle,
  Clock,
  Users,
  Download,
  BarChart3,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import DeleteAppButton from '@/components/DeleteAppButton';
import PlanLimitBanner from '@/components/PlanLimitBanner';
import PublishButton from '@/components/PublishButton';
import { PLAN_LIMITS } from '@/lib/auth';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      apps: {
        select: {
          id: true,
          appName: true,
          targetUrl: true,
          themeColor: true,
          status: true,
          slug: true,
          failureReason: true,
          totalVisits: true,
          uniqueVisitors: true,
          totalInstalls: true,
          createdAt: true,
          customDomain: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { apps: true } },
    },
  });

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const apps = user.apps;
  const appCount = user._count.apps;
  const planLimit = PLAN_LIMITS[user.plan];
  const canCreateMore = appCount < planLimit;

  return (
    <div className="space-y-6">
      {/* Plan Limit Banner */}
      {!canCreateMore && <PlanLimitBanner plan={user.plan} limit={planLimit} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {t('dashboard.title')}
        </h1>
        {canCreateMore ? (
          <Link
            href="/dashboard/create"
            className="inline-flex items-center justify-center rounded-xl border border-transparent bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md hover:shadow-[#178BFF]/25 focus:outline-none focus:ring-2 focus:ring-[#178BFF] focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            {t('dashboard.createButton')}
          </Link>
        ) : (
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-xl border border-transparent bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600"
          >
            {t('settings.plan.upgradeButton')}
          </Link>
        )}
      </div>

      {apps.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#178BFF]/10 to-[#5B2CCF]/10">
            <Smartphone className="h-8 w-8 text-[#178BFF]" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
            {t('dashboard.emptyState.title')}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.emptyState.description')}
          </p>
          <Link
            href="/dashboard/create"
            className="mt-6 inline-flex items-center rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-md hover:shadow-[#178BFF]/25"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            {t('dashboard.emptyState.button')}
          </Link>
        </div>
      ) : (
        // App grid
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all hover:shadow-md dark:bg-gray-900 dark:ring-gray-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: app.themeColor || '#178BFF' }}
                  >
                    <Smartphone size={24} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/preview/${app.id}`}
                      className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      title={t('dashboard.appCard.actions.preview')}
                    >
                      <Eye size={18} />
                    </Link>
                    <Link
                      href={`/dashboard/edit/${app.id}`}
                      className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      title={t('dashboard.appCard.actions.edit')}
                    >
                      <Edit size={18} />
                    </Link>
                    <DeleteAppButton appId={app.id} appName={app.appName} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <Link
                      href={`/dashboard/preview/${app.id}`}
                      className="hover:text-[#178BFF] break-all"
                    >
                      {app.appName}
                    </Link>
                  </h3>
                  <div className="mt-1 flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="break-all">{app.targetUrl}</span>
                    <ExternalLink size={12} className="flex-shrink-0 mt-1" />
                  </div>
                </div>

                {/* Publish actions */}
                <div className="mt-4">
                  <PublishButton
                    appId={app.id}
                    appName={app.appName}
                    currentStatus={app.status}
                    slug={app.slug}
                    failureReason={app.failureReason}
                  />
                </div>
              </div>

              {/* Analytics Mini Summary */}
              {app.status === 'PUBLISHED' && (
                <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1" title={t('analytics.totalVisits')}>
                        <Eye size={12} className="text-[#178BFF]" />
                        {app.totalVisits}
                      </span>
                      <span className="inline-flex items-center gap-1" title={t('analytics.uniqueVisitors')}>
                        <Users size={12} className="text-green-500" />
                        {app.uniqueVisitors}
                      </span>
                      <span className="inline-flex items-center gap-1" title={t('analytics.installClicks')}>
                        <Download size={12} className="text-[#5B2CCF]" />
                        {app.totalInstalls}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/apps/${app.id}/analytics`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#178BFF] hover:bg-[#178BFF]/10"
                      title={t('analytics.viewAnalytics')}
                    >
                      <BarChart3 size={12} />
                      {t('analytics.title')}
                    </Link>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('dashboard.appCard.createdOn')}{' '}
                    {new Date(app.createdAt).toLocaleDateString(locale, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <StatusBadge status={app.status} t={t} />
                </div>
                {app.customDomain && (
                  <div className="mt-1 flex items-start gap-1 text-xs text-gray-400">
                    <Globe size={10} className="flex-shrink-0 mt-0.5" />
                    <span className="break-all">{app.customDomain}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge Component ──────────────────────────────────────────────────

function StatusBadge({
  status,
  t,
}: {
  status: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const config: Record<
    string,
    { bg: string; icon: React.ReactNode }
  > = {
    PUBLISHED: {
      bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icon: <Globe size={12} className="mr-1" />,
    },
    GENERATING: {
      bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      icon: <Loader2 size={12} className="mr-1 animate-spin" />,
    },
    QUEUED: {
      bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      icon: <Clock size={12} className="mr-1" />,
    },
    FAILED: {
      bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      icon: <AlertTriangle size={12} className="mr-1" />,
    },
    STAGED: {
      bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      icon: null,
    },
    DRAFT: {
      bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
      icon: null,
    },
  };

  const c = config[status] || config.DRAFT;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg}`}
    >
      {c.icon}
      {t(`dashboard.appCard.status.${status.toLowerCase()}`)}
    </span>
  );
}
