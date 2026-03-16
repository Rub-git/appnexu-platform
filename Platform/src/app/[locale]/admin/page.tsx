'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  Smartphone,
  Globe,
  Crown,
  Zap,
  UserPlus,
  AlertTriangle,
  Loader2,
  Clock,
  LayoutTemplate,
  Download,
  Sparkles,
  BarChart3,
} from 'lucide-react';

interface AdminStats {
  totals: {
    users: number;
    apps: number;
    publishedApps: number;
    proUsers: number;
    agencyUsers: number;
    recentSignups: number;
    recentPublished: number;
    failedJobs: number;
    queuedJobs: number;
    generatingJobs: number;
  };
  templates: {
    total: number;
    premium: number;
    mostUsed: Array<{ name: string; slug: string; usageCount: number; category: string }>;
  };
  apkBuilds: {
    totalExports: number;
    failedBuilds: number;
    buildQueue: number;
  };
  aiAnalysis: {
    totalRequests: number;
    completed: number;
    failed: number;
    completionRate: number;
  };
  recentSignups: Array<{
    id: string;
    name: string | null;
    email: string;
    plan: string;
    role: string;
    createdAt: string;
  }>;
  recentPublished: Array<{
    id: string;
    appName: string;
    slug: string;
    lastGeneratedAt: string;
    user: { email: string };
  }>;
  recentFailed: Array<{
    id: string;
    appName: string;
    slug: string;
    failureReason: string | null;
    retryCount: number;
    updatedAt: string;
    user: { email: string };
  }>;
}

export default function AdminDashboardPage() {
  const t = useTranslations();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => { if (d.data) setStats(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-20 text-gray-500">{t('admin.loadError')}</div>;
  }

  const { totals } = stats;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.overview.title')}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={<Users className="h-5 w-5 text-blue-600" />} label={t('admin.overview.totalUsers')} value={totals.users} bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard icon={<Smartphone className="h-5 w-5 text-green-600" />} label={t('admin.overview.totalApps')} value={totals.apps} bg="bg-green-50 dark:bg-green-900/20" />
        <StatCard icon={<Globe className="h-5 w-5 text-purple-600" />} label={t('admin.overview.publishedApps')} value={totals.publishedApps} bg="bg-purple-50 dark:bg-purple-900/20" />
        <StatCard icon={<Zap className="h-5 w-5 text-amber-600" />} label={t('admin.overview.proUsers')} value={totals.proUsers} bg="bg-amber-50 dark:bg-amber-900/20" />
        <StatCard icon={<Crown className="h-5 w-5 text-pink-600" />} label={t('admin.overview.agencyUsers')} value={totals.agencyUsers} bg="bg-pink-50 dark:bg-pink-900/20" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<UserPlus className="h-5 w-5 text-teal-600" />} label={t('admin.overview.recentSignups')} value={totals.recentSignups} bg="bg-teal-50 dark:bg-teal-900/20" sub="7d" />
        <StatCard icon={<Globe className="h-5 w-5 text-[#178BFF]" />} label={t('admin.overview.recentPublished')} value={totals.recentPublished} bg="bg-[#178BFF]/5 dark:bg-[#178BFF]/10" sub="7d" />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} label={t('admin.overview.failedJobs')} value={totals.failedJobs} bg="bg-red-50 dark:bg-red-900/20" />
        <StatCard icon={<Clock className="h-5 w-5 text-orange-600" />} label={t('admin.overview.queuedJobs')} value={totals.queuedJobs + totals.generatingJobs} bg="bg-orange-50 dark:bg-orange-900/20" />
      </div>

      {/* New Feature Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Templates Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <LayoutTemplate className="h-5 w-5 text-[#178BFF]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.overview.templatesTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-[#178BFF]/5 p-3 dark:bg-[#178BFF]/10">
              <p className="text-xs text-[#178BFF] dark:text-[#178BFF]">{t('admin.overview.totalTemplates')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.templates.total}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-xs text-amber-600 dark:text-amber-400">{t('admin.overview.premiumTemplates')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.templates.premium}</p>
            </div>
          </div>
          {stats.templates.mostUsed.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">{t('admin.overview.mostUsedTemplates')}</p>
              {stats.templates.mostUsed.map((tpl, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{tpl.name}</span>
                  <span className="text-xs text-gray-400">{tpl.usageCount} {t('admin.overview.uses')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* APK Builds Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.overview.apkBuildsTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-xs text-green-600 dark:text-green-400">{t('admin.overview.totalExports')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.apkBuilds.totalExports}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-xs text-red-600 dark:text-red-400">{t('admin.overview.failedBuilds')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.apkBuilds.failedBuilds}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
              <p className="text-xs text-orange-600 dark:text-orange-400">{t('admin.overview.buildQueue')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.apkBuilds.buildQueue}</p>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.overview.aiAnalysisTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
              <p className="text-xs text-purple-600 dark:text-purple-400">{t('admin.overview.analysisRequests')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.aiAnalysis.totalRequests}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-xs text-green-600 dark:text-green-400">{t('admin.overview.completionRate')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.aiAnalysis.completionRate}%</p>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('admin.overview.completedAnalyses')}: {stats.aiAnalysis.completed}</span>
            <span className="text-red-500">{t('admin.overview.failedAnalyses')}: {stats.aiAnalysis.failed}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Signups */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.overview.recentSignupsTitle')}
          </h2>
          {stats.recentSignups.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSignups.map((u) => (
                <div key={u.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{u.name || u.email}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlanBadge plan={u.plan} />
                    <span className="text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t('admin.noData')}</p>
          )}
        </div>

        {/* Recent Failed */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.overview.recentFailedTitle')}
          </h2>
          {stats.recentFailed.length > 0 ? (
            <div className="space-y-3">
              {stats.recentFailed.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{a.appName}</p>
                    <p className="text-xs text-red-500 truncate max-w-[200px]">{a.failureReason || 'Unknown error'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{a.user.email}</p>
                    <p className="text-xs text-gray-400">Retries: {a.retryCount}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-600">✓ {t('admin.overview.noFailures')}</p>
          )}
        </div>
      </div>

      {/* Recent Published */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('admin.overview.recentPublishedTitle')}
        </h2>
        {stats.recentPublished.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 pr-4 font-medium text-gray-500">{t('admin.apps.name')}</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500">{t('admin.apps.slug')}</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500">{t('admin.apps.owner')}</th>
                  <th className="pb-3 font-medium text-gray-500">{t('admin.apps.publishedDate')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPublished.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{a.appName}</td>
                    <td className="py-2 pr-4 text-gray-500">{a.slug}</td>
                    <td className="py-2 pr-4 text-gray-500">{a.user.email}</td>
                    <td className="py-2 text-gray-400">{a.lastGeneratedAt ? new Date(a.lastGeneratedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t('admin.noData')}</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg, sub }: { icon: React.ReactNode; label: string; value: number; bg: string; sub?: string }) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
        {sub && <span className="text-[10px] text-gray-400">({sub})</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    PRO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    AGENCY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[plan] || colors.FREE}`}>
      {plan}
    </span>
  );
}
