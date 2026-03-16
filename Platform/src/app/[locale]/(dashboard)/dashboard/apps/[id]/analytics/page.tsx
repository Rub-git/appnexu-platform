'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft,
  Eye,
  Users,
  Download,
  Send,
  Calendar,
  Activity,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { use } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AnalyticsSummary {
  totals: {
    totalVisits: number;
    uniqueVisitors: number;
    totalInstalls: number;
    lastVisitedAt: string | null;
    lastPublishedAt: string | null;
  };
  dailySummaries: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    installClicks: number;
    publishCount: number;
  }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    timestamp: string;
    metadata: Record<string, unknown> | null;
  }>;
}

interface ChartDataPoint {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  installClicks: number;
}

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = use(params);
  const t = useTranslations();
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, chartRes] = await Promise.all([
        fetch(`/api/apps/${id}/analytics?period=${period}`),
        fetch(`/api/apps/${id}/analytics/chart?period=${period}`),
      ]);

      if (!summaryRes.ok || !chartRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const summaryData = await summaryRes.json();
      const chartDataRes = await chartRes.json();

      setSummary(summaryData.data);
      setChartData(chartDataRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [id, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('analytics.never');
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
        >
          {t('offline.tryAgain')}
        </button>
      </div>
    );
  }

  const totals = summary?.totals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard`}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('analytics.title')}
            </h1>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {t(`analytics.period.${p}`)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Eye className="h-5 w-5 text-blue-600" />}
          label={t('analytics.totalVisits')}
          value={totals?.totalVisits || 0}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <SummaryCard
          icon={<Users className="h-5 w-5 text-green-600" />}
          label={t('analytics.uniqueVisitors')}
          value={totals?.uniqueVisitors || 0}
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <SummaryCard
          icon={<Download className="h-5 w-5 text-purple-600" />}
          label={t('analytics.installClicks')}
          value={totals?.totalInstalls || 0}
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <SummaryCard
          icon={<Send className="h-5 w-5 text-amber-600" />}
          label={t('analytics.lastPublished')}
          value={totals?.lastPublishedAt ? formatDate(totals.lastPublishedAt) : t('analytics.never')}
          bgColor="bg-amber-50 dark:bg-amber-900/20"
          isText
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('analytics.trends')}
          </h2>
        </div>

        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => formatShortDate(label as string)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pageViews"
                  name={t('analytics.chart.pageViews')}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="uniqueVisitors"
                  name={t('analytics.chart.uniqueVisitors')}
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="installClicks"
                  name={t('analytics.chart.installClicks')}
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <BarChart3 className="mb-2 h-10 w-10" />
            <p>{t('analytics.noData')}</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('analytics.recentActivity')}
          </h2>
        </div>

        {summary?.recentEvents && summary.recentEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">
                    Event
                  </th>
                  <th className="pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Time
                  </th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.recentEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-3 pr-4">
                      <EventBadge eventType={event.eventType} t={t} />
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {formatDate(event.timestamp)}
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-500">
                      {event.metadata ? (
                        <MetadataBadges metadata={event.metadata as Record<string, unknown>} />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Activity className="mb-2 h-8 w-8" />
            <p>{t('analytics.noData')}</p>
            <p className="mt-1 text-xs">{t('analytics.noDataDescription')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  bgColor,
  isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bgColor: string;
  isText?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 ${bgColor}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div className="mt-2">
        {isText ? (
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {value}
          </p>
        ) : (
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Metadata Badges ─────────────────────────────────────────────────────────

function MetadataBadges({ metadata }: { metadata: Record<string, unknown> }) {
  const badges: string[] = [];
  if (metadata.deviceType) badges.push(String(metadata.deviceType));
  if (metadata.browser) badges.push(String(metadata.browser));
  if (metadata.referrer) badges.push(String(metadata.referrer));

  if (badges.length === 0) return <span>—</span>;

  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((badge, i) => (
        <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
          {badge}
        </span>
      ))}
    </span>
  );
}

// ─── Event Badge ─────────────────────────────────────────────────────────────

function EventBadge({
  eventType,
  t,
}: {
  eventType: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const config: Record<string, { bg: string; icon: React.ReactNode }> = {
    PAGE_VIEW: {
      bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: <Eye size={12} className="mr-1" />,
    },
    INSTALL_CLICK: {
      bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      icon: <Download size={12} className="mr-1" />,
    },
    PUBLISHED: {
      bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: <Send size={12} className="mr-1" />,
    },
    UNIQUE_VISIT: {
      bg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      icon: <Users size={12} className="mr-1" />,
    },
  };

  const c = config[eventType] || config.PAGE_VIEW;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg}`}
    >
      {c.icon}
      {t(`analytics.events.${eventType}` as Parameters<typeof t>[0])}
    </span>
  );
}
