import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { AppStatus, Prisma } from '@prisma/client';
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
  Share2,
  TrendingUp,
  Activity,
  Rocket,
  Calendar,
  Search,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import DeleteAppButton from '@/components/DeleteAppButton';
import PlanLimitBanner from '@/components/PlanLimitBanner';
import PublishButton from '@/components/PublishButton';
import { PLAN_LIMITS } from '@/lib/auth';
import AppMiniPreview from '@/components/AppMiniPreview';
import DashboardListPrefsSync from '@/components/DashboardListPrefsSync';
import { getSaaSState, getSaaSStateTone, SAAS_PLAN_META } from '@/lib/saas';
import { getDashboardSummaryCached } from '@/lib/dashboard-cache';

const DASHBOARD_PAGE_SIZES = [12, 24, 48] as const;
const DASHBOARD_DEFAULT_PAGE_SIZE = 24;
const DASHBOARD_FILTER_STATUS = ['ALL', 'DRAFT', 'QUEUED', 'GENERATING', 'STAGED', 'PUBLISHED', 'FAILED'] as const;
const DASHBOARD_SORT_OPTIONS = ['recent', 'visits', 'installs', 'name'] as const;
type DashboardFilterStatus = (typeof DASHBOARD_FILTER_STATUS)[number];
type DashboardSortOption = (typeof DASHBOARD_SORT_OPTIONS)[number];

function encodeCursorToken(cursor?: string) {
  return cursor ?? 'ROOT';
}

function decodeCursorToken(token: string) {
  return token === 'ROOT' ? undefined : token;
}

function formatDashboardDate(value: unknown, locale: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;

  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return null;
  }
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ size?: string; status?: string; sort?: string; cursor?: string; stack?: string; q?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const rawPageSize = Number.parseInt(resolvedSearchParams.size ?? `${DASHBOARD_DEFAULT_PAGE_SIZE}`, 10);
  const pageSize = DASHBOARD_PAGE_SIZES.includes(rawPageSize as (typeof DASHBOARD_PAGE_SIZES)[number])
    ? (rawPageSize as (typeof DASHBOARD_PAGE_SIZES)[number])
    : DASHBOARD_DEFAULT_PAGE_SIZE;
  const requestedStatus = resolvedSearchParams.status?.toUpperCase() ?? 'ALL';
  const activeStatus: DashboardFilterStatus = DASHBOARD_FILTER_STATUS.includes(requestedStatus as DashboardFilterStatus)
    ? (requestedStatus as DashboardFilterStatus)
    : 'ALL';
  const requestedSort = (resolvedSearchParams.sort ?? 'recent').toLowerCase();
  const activeSort: DashboardSortOption = DASHBOARD_SORT_OPTIONS.includes(requestedSort as DashboardSortOption)
    ? (requestedSort as DashboardSortOption)
    : 'recent';
  const requestedCursor = resolvedSearchParams.cursor?.trim() || undefined;
  const requestedStack = resolvedSearchParams.stack?.trim() || '';
  const activeQuery = (resolvedSearchParams.q ?? '').trim().slice(0, 80);
  const cursorStack = requestedStack
    ? requestedStack
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
    : [];
  const decodedStack = cursorStack.map(decodeCursorToken);
  setRequestLocale(locale);

  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.error('[DashboardPage] auth() failed, redirecting to login:', error);
    redirect(`/${locale}/login`);
  }

  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations();

  if (!session?.user?.id) redirect(`/${locale}/login`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      _count: { select: { apps: true } },
    },
  });

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const appCount = user._count.apps;
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const appsWhere: Prisma.AppProjectWhereInput = {
    userId: session.user.id,
    ...(activeStatus !== 'ALL' ? { status: activeStatus as AppStatus } : {}),
    ...(activeQuery
      ? {
          appName: {
            contains: activeQuery,
            mode: 'insensitive',
          },
        }
      : {}),
  };

  const orderBy: Prisma.AppProjectOrderByWithRelationInput[] = (() => {
    switch (activeSort) {
      case 'visits':
        return [{ totalVisits: 'desc' }, { id: 'desc' }];
      case 'installs':
        return [{ totalInstalls: 'desc' }, { id: 'desc' }];
      case 'name':
        return [{ appName: 'asc' }, { id: 'asc' }];
      default:
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
  })();

  const cursorCandidates = [
    requestedCursor,
    ...decodedStack.slice().reverse(),
  ].filter((value): value is string => Boolean(value));

  const validCursorIds = cursorCandidates.length > 0
    ? await prisma.appProject.findMany({
        where: {
          id: { in: cursorCandidates },
          ...appsWhere,
        },
        select: { id: true },
      })
    : [];
  const validCursorSet = new Set(validCursorIds.map((row) => row.id));

  let effectiveCursor: string | undefined;
  let effectiveStack: string[] = [];
  let cursorRecovered = false;

  if (!requestedCursor) {
    effectiveCursor = undefined;
    effectiveStack = [];
  } else if (validCursorSet.has(requestedCursor)) {
    effectiveCursor = requestedCursor;
    effectiveStack = cursorStack;
  } else {
    cursorRecovered = true;
    for (let index = cursorStack.length - 1; index >= 0; index -= 1) {
      const candidate = decodeCursorToken(cursorStack[index]);
      if (!candidate) {
        effectiveCursor = undefined;
        effectiveStack = cursorStack.slice(0, index);
        break;
      }
      if (validCursorSet.has(candidate)) {
        effectiveCursor = candidate;
        effectiveStack = cursorStack.slice(0, index);
        break;
      }
    }
  }

  if (!session?.user?.id) redirect(`/${locale}/login`);
  const [appsWindow, dashboardSummary, filteredCount] = await Promise.all([
    prisma.appProject.findMany({
      where: appsWhere,
      select: {
        id: true,
        appName: true,
        targetUrl: true,
        themeColor: true,
        status: true,
        pwaMode: true,
        pwaModeManual: true,
        slug: true,
        failureReason: true,
        createdAt: true,
        updatedAt: true,
        customDomain: true,
        iconUrls: true,
      },
      orderBy,
      ...(effectiveCursor ? { cursor: { id: effectiveCursor }, skip: 1 } : {}),
      take: pageSize + 1,
    }),
    getDashboardSummaryCached(session.user.id),
    prisma.appProject.count({ where: appsWhere }),
  ]);

  const hasNextPage = appsWindow.length > pageSize;
  const apps = hasNextPage ? appsWindow.slice(0, pageSize) : appsWindow;
  const visiblePublishedIds = apps
    .filter((app) => app.status === 'PUBLISHED')
    .map((app) => app.id);
  const publishedRows = visiblePublishedIds.length > 0
    ? await prisma.appProject.findMany({
        where: {
          id: { in: visiblePublishedIds },
        },
        select: {
          id: true,
          totalVisits: true,
          uniqueVisitors: true,
          totalInstalls: true,
        },
      })
    : [];
  const publishedStatsById = publishedRows.reduce<Record<string, { totalVisits: number; uniqueVisitors: number; totalInstalls: number }>>((acc, row) => {
    acc[row.id] = {
      totalVisits: row.totalVisits,
      uniqueVisitors: row.uniqueVisitors,
      totalInstalls: row.totalInstalls,
    };
    return acc;
  }, {});
  const nextCursor = hasNextPage ? apps[apps.length - 1]?.id : undefined;
  const hasPrevPage = effectiveStack.length > 0;
  const prevCursorToken = hasPrevPage ? effectiveStack[effectiveStack.length - 1] : undefined;
  const prevCursor = prevCursorToken ? decodeCursorToken(prevCursorToken) : undefined;
  const prevStack = hasPrevPage ? effectiveStack.slice(0, -1) : [];
  const nextStack = hasNextPage ? [...effectiveStack, encodeCursorToken(effectiveCursor)] : effectiveStack;

  const planLimit = PLAN_LIMITS[user.plan];
  const canCreateMore = appCount < planLimit;
  const planMeta = SAAS_PLAN_META[user.plan];
  const totalVisits = dashboardSummary.totalVisits;
  const totalOpens = dashboardSummary.totalOpens;
  const totalInstalls = dashboardSummary.totalInstalls;
  const publishedApps = dashboardSummary.publishedApps;
  const unpublishedApps = Math.max(0, appCount - publishedApps);
  const conversionRate = totalVisits > 0 ? (totalInstalls / totalVisits) * 100 : 0;
  const latestPublishedAt = dashboardSummary.latestPublishedAt;
  const isEs = locale === 'es';
  const hasAnyApps = appCount > 0;
  const hasFilteredApps = apps.length > 0;
  const currentPageIndex = effectiveStack.length + 1;
  const statusCounts = dashboardSummary.statusCounts;
  const filterOptions = [
    { value: 'ALL' as DashboardFilterStatus, label: isEs ? 'Todas' : 'All', count: appCount },
    { value: 'PUBLISHED' as DashboardFilterStatus, label: isEs ? 'Publicadas' : 'Published', count: statusCounts.PUBLISHED ?? 0 },
    { value: 'DRAFT' as DashboardFilterStatus, label: isEs ? 'Borrador' : 'Draft', count: statusCounts.DRAFT ?? 0 },
    { value: 'FAILED' as DashboardFilterStatus, label: isEs ? 'Con error' : 'Failed', count: statusCounts.FAILED ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <DashboardListPrefsSync
        size={pageSize}
        status={activeStatus}
        sort={activeSort}
      />

      {/* Plan Limit Banner */}
      {!canCreateMore && <PlanLimitBanner plan={user.plan} limit={planLimit} />}

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
            Mis Apps
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona, publica y comparte tus PWAs en un solo lugar.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Plan actual: <span className="font-semibold text-slate-700 dark:text-slate-300">{planMeta.marketingName}</span> · Uso apps: {planLimit === Infinity ? `${appCount} / ilimitadas` : `${appCount}/${planLimit}`}
          </p>
        </div>
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

      {hasAnyApps ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{isEs ? 'Resumen de negocio' : 'Business summary'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEs ? 'Analíticas esenciales para medir rendimiento comercial.' : 'Essential analytics to measure commercial performance.'}
              </p>
            </div>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {isEs ? 'Ver Billing' : 'View Billing'}
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <BusinessStat
              icon={<Eye className="h-4 w-4 text-blue-600" />}
              label={isEs ? 'Visitas' : 'Visits'}
              value={totalVisits.toLocaleString(locale)}
            />
            <BusinessStat
              icon={<Activity className="h-4 w-4 text-cyan-600" />}
              label={isEs ? 'Aperturas (únicas)' : 'Opens (unique)'}
              value={totalOpens.toLocaleString(locale)}
            />
            <BusinessStat
              icon={<Download className="h-4 w-4 text-violet-600" />}
              label={isEs ? 'Instalaciones' : 'Installs'}
              value={totalInstalls.toLocaleString(locale)}
            />
            <BusinessStat
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              label={isEs ? 'Conversión visita → instalación' : 'Visit → install conversion'}
              value={`${conversionRate.toFixed(1)}%`}
            />
            <BusinessStat
              icon={<Calendar className="h-4 w-4 text-amber-600" />}
              label={isEs ? 'Última publicación' : 'Last publish'}
              value={formatDashboardDate(latestPublishedAt, locale) ?? (isEs ? 'Nunca' : 'Never')}
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
            <p className="inline-flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
              <Rocket className="h-4 w-4 text-emerald-600" />
              {isEs
                ? `Apps publicadas: ${publishedApps}/${appCount}. ${unpublishedApps > 0 ? `Tienes ${unpublishedApps} app(s) listas para convertir en tracción.` : 'Excelente: todo tu portafolio está publicado.'}`
                : `Published apps: ${publishedApps}/${appCount}. ${unpublishedApps > 0 ? `You have ${unpublishedApps} app(s) ready to convert into traction.` : 'Great: your whole portfolio is published.'}`}
            </p>
          </div>
        </section>
      ) : null}

      {hasAnyApps ? (
        // App grid
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-1">
              <p className="text-slate-700 dark:text-slate-200">
                {isEs
                  ? `Mostrando ${apps.length} de ${filteredCount} app(s) filtradas · Pagina ${currentPageIndex}`
                  : `Showing ${apps.length} of ${filteredCount} filtered app(s) · Page ${currentPageIndex}`}
              </p>
              {cursorRecovered && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  {isEs
                    ? 'La lista cambio mientras navegabas. Reajustamos tu posicion al bloque valido mas cercano.'
                    : 'The list changed while navigating. We adjusted your position to the nearest valid chunk.'}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {filterOptions.map((option) => {
                  const isActive = activeStatus === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={buildDashboardHref({
                        size: pageSize,
                        status: option.value,
                        sort: activeSort,
                        q: activeQuery,
                      })}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option.label} ({option.count})
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {isEs ? 'Tamano' : 'Page size'}
              </span>
              {DASHBOARD_PAGE_SIZES.map((sizeOption) => {
                const isActive = pageSize === sizeOption;
                return (
                  <Link
                    key={sizeOption}
                    href={buildDashboardHref({
                      size: sizeOption,
                      status: activeStatus,
                      sort: activeSort,
                      q: activeQuery,
                    })}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sizeOption}
                  </Link>
                );
              })}
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {isEs ? 'Orden' : 'Sort'}
              </span>
              {[
                { value: 'recent' as DashboardSortOption, label: isEs ? 'Recientes' : 'Recent' },
                { value: 'visits' as DashboardSortOption, label: isEs ? 'Visitas' : 'Visits' },
                { value: 'installs' as DashboardSortOption, label: isEs ? 'Instalaciones' : 'Installs' },
                { value: 'name' as DashboardSortOption, label: isEs ? 'Nombre' : 'Name' },
              ].map((sortOption) => {
                const isActive = activeSort === sortOption.value;
                return (
                  <Link
                    key={sortOption.value}
                    href={buildDashboardHref({
                      size: pageSize,
                      status: activeStatus,
                      sort: sortOption.value,
                      q: activeQuery,
                    })}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      isActive
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sortOption.label}
                  </Link>
                );
              })}
            </div>
            <form className="flex w-full max-w-sm items-center gap-2" method="get" action={`/${locale}/dashboard`}>
              <input type="hidden" name="size" value={String(pageSize)} />
              {activeStatus !== 'ALL' && <input type="hidden" name="status" value={activeStatus} />}
              {activeSort !== 'recent' && <input type="hidden" name="sort" value={activeSort} />}
              <label htmlFor="dashboard-q" className="sr-only">
                {isEs ? 'Buscar app por nombre' : 'Search app by name'}
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="dashboard-q"
                  name="q"
                  defaultValue={activeQuery}
                  placeholder={isEs ? 'Buscar por nombre...' : 'Search by app name...'}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                />
              </div>
              <button
                type="submit"
                className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {isEs ? 'Buscar' : 'Search'}
              </button>
              {activeQuery && (
                <Link
                  href={buildDashboardHref({
                    size: pageSize,
                    status: activeStatus,
                    sort: activeSort,
                  })}
                  className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold leading-9 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isEs ? 'Limpiar' : 'Clear'}
                </Link>
              )}
            </form>
          </div>

          {!hasFilteredApps ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {activeQuery
                  ? (isEs ? 'No encontramos apps con ese nombre. Prueba otro termino.' : 'No apps matched this search. Try another term.')
                  : (isEs ? 'No hay apps para este filtro. Prueba otro estado.' : 'No apps for this filter yet. Try another status.')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 dark:ring-gray-800"
                >
                  <div className="p-6">
                    <AppMiniPreview
                      url={app.status === 'PUBLISHED' ? (app.customDomain ? `https://${app.customDomain}` : `/${locale}/app/${app.slug}`) : app.targetUrl}
                      appName={app.appName}
                      themeColor={app.themeColor}
                      iconUrl={app.iconUrls?.split(',').map((item) => item.trim()).find(Boolean)}
                      livePreview={app.status === 'PUBLISHED'}
                    />

                    <div className="flex items-center justify-between">
                      <div
                        className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
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

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                      <p><span className="font-semibold">Dominio:</span> {app.customDomain || 'Sin dominio custom'}</p>
                      <p className="mt-1"><span className="font-semibold">Actualizada:</span> {formatDashboardDate(app.updatedAt, locale) ?? '—'}</p>
                      <p className="mt-1"><span className="font-semibold">Estado SaaS:</span> {getSaaSState(app.status)}</p>
                    </div>
                  </div>

                  {/* Analytics Mini Summary */}
                  {app.status === 'PUBLISHED' && (
                    (() => {
                      const stats = publishedStatsById[app.id] ?? {
                        totalVisits: 0,
                        uniqueVisitors: 0,
                        totalInstalls: 0,
                      };
                      return (
                    <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1" title={t('analytics.totalVisits')}>
                            <Eye size={12} className="text-[#178BFF]" />
                            {stats.totalVisits}
                          </span>
                          <span className="inline-flex items-center gap-1" title={t('analytics.uniqueVisitors')}>
                            <Users size={12} className="text-green-500" />
                            {stats.uniqueVisitors}
                          </span>
                          <span className="inline-flex items-center gap-1" title={t('analytics.installClicks')}>
                            <Download size={12} className="text-[#5B2CCF]" />
                            {stats.totalInstalls}
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
                      );
                    })()
                  )}

                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('dashboard.appCard.createdOn')}{' '}
                        {formatDashboardDate(app.createdAt, locale, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <StatusBadge status={app.status} />
                    </div>
                    {app.customDomain && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-gray-400">
                        <Globe size={10} className="flex-shrink-0 mt-0.5" />
                        <span className="break-all">{app.customDomain}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span>Modo PWA: {app.pwaMode === 'IMPORT' ? 'Import' : 'Generator'} ({app.pwaModeManual ? 'manual' : 'auto'})</span>
                      {app.status === 'PUBLISHED' ? (
                        <a
                          href={app.customDomain ? `https://${app.customDomain}` : `/${locale}/app/${app.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"
                        >
                          <Share2 size={10} /> Compartir
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                {hasPrevPage && (
                  <Link
                    href={buildDashboardHref({
                      size: pageSize,
                      status: activeStatus,
                      sort: activeSort,
                      cursor: prevCursor,
                      stack: prevStack,
                      q: activeQuery,
                    })}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isEs ? 'Bloque anterior' : 'Previous chunk'}
                  </Link>
                )}
                {effectiveCursor && (
                  <Link
                    href={buildDashboardHref({
                      size: pageSize,
                      status: activeStatus,
                      sort: activeSort,
                      q: activeQuery,
                    })}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isEs ? 'Reiniciar lista' : 'Reset list'}
                  </Link>
                )}
                <Link
                  href={hasNextPage && nextCursor
                    ? buildDashboardHref({
                        size: pageSize,
                        status: activeStatus,
                        sort: activeSort,
                        cursor: nextCursor,
                        stack: nextStack,
                        q: activeQuery,
                      })
                    : buildDashboardHref({
                        size: pageSize,
                        status: activeStatus,
                        sort: activeSort,
                        q: activeQuery,
                      })}
                  aria-disabled={!hasNextPage || !nextCursor}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    hasNextPage && nextCursor
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                      : 'cursor-not-allowed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500'
                  }`}
                  tabIndex={hasNextPage && nextCursor ? undefined : -1}
                >
                  {isEs ? 'Siguiente bloque' : 'Next chunk'}
                </Link>
              </div>
            </>
          )}
        </>
      ) : (
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
      )}
    </div>
  );
}

function buildDashboardHref({
  size,
  status,
  sort,
  cursor,
  stack,
  q,
}: {
  size: number;
  status: DashboardFilterStatus;
  sort: DashboardSortOption;
  cursor?: string;
  stack?: string[];
  q?: string;
}) {
  const query = new URLSearchParams();
  query.set('size', String(size));
  if (status !== 'ALL') {
    query.set('status', status);
  }
  if (sort !== 'recent') {
    query.set('sort', sort);
  }
  if (cursor) {
    query.set('cursor', cursor);
  }
  if (stack && stack.length > 0) {
    query.set('stack', stack.join(','));
  }
  if (q) {
    query.set('q', q);
  }

  return `/dashboard?${query.toString()}`;
}

function BusinessStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">{icon}{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

// ─── Status Badge Component ──────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const state = getSaaSState(status as Parameters<typeof getSaaSState>[0]);
  const tone = getSaaSStateTone(state);
  const config: Record<
    string,
    { bg: string; icon: React.ReactNode; label: string }
  > = {
    PUBLISHED: {
      bg: tone,
      icon: <Globe size={12} className="mr-1" />,
      label: state,
    },
    GENERATING: {
      bg: tone,
      icon: <Loader2 size={12} className="mr-1 animate-spin" />,
      label: state,
    },
    QUEUED: {
      bg: tone,
      icon: <Clock size={12} className="mr-1" />,
      label: state,
    },
    FAILED: {
      bg: tone,
      icon: <AlertTriangle size={12} className="mr-1" />,
      label: state,
    },
    STAGED: {
      bg: tone,
      icon: null,
      label: state,
    },
    DRAFT: {
      bg: tone,
      icon: null,
      label: state,
    },
  };

  const c = config[status] || config.DRAFT;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}
