'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Smartphone,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Globe,
  Eye,
  Users,
  Download,
  ExternalLink,
} from 'lucide-react';

interface AppRow {
  id: string;
  appName: string;
  slug: string;
  targetUrl: string;
  status: string;
  customDomain: string | null;
  totalVisits: number;
  uniqueVisitors: number;
  totalInstalls: number;
  failureReason: string | null;
  retryCount: number;
  lastGeneratedAt: string | null;
  lastPublishedAt: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null; plan: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminAppsPage() {
  const t = useTranslations();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerPlanFilter, setOwnerPlanFilter] = useState('');

  const fetchApps = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (ownerPlanFilter) params.set('ownerPlan', ownerPlanFilter);

      const res = await fetch(`/api/admin/apps?${params}`);
      const data = await res.json();
      if (data.data) {
        setApps(data.data.apps);
        setPagination(data.data.pagination);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, statusFilter, ownerPlanFilter]);

  useEffect(() => { fetchApps(1); }, [fetchApps]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        <Smartphone className="inline mr-2 h-6 w-6" />
        {t('admin.apps.title')}
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.apps.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">{t('admin.filters.allStatuses')}</option>
          <option value="DRAFT">DRAFT</option>
          <option value="QUEUED">QUEUED</option>
          <option value="GENERATING">GENERATING</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <select
          value={ownerPlanFilter}
          onChange={(e) => setOwnerPlanFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">{t('admin.filters.allPlans')}</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="AGENCY">AGENCY</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.apps.name')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.apps.owner')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.apps.status')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.apps.domain')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.apps.analytics')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.apps.created')}</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{app.appName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        /{app.slug}
                        {app.status === 'PUBLISHED' && (
                          <a href={`/app/${app.slug}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600 dark:text-gray-400 text-xs">{app.user.email}</p>
                    <PlanBadge plan={app.user.plan} />
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-4 py-3">
                    {app.customDomain ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <Globe size={10} /> {app.customDomain}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1" title="Visits">
                        <Eye size={10} className="text-blue-500" /> {app.totalVisits}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Unique">
                        <Users size={10} className="text-green-500" /> {app.uniqueVisitors}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Installs">
                        <Download size={10} className="text-purple-500" /> {app.totalInstalls}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {apps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('admin.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('admin.pagination.showing', { from: (pagination.page - 1) * pagination.limit + 1, to: Math.min(pagination.page * pagination.limit, pagination.total), total: pagination.total })}
          </p>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => fetchApps(pagination.page - 1)} className="rounded-lg border border-gray-300 p-2 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <ChevronLeft size={16} />
            </button>
            <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">{pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchApps(pagination.page + 1)} className="rounded-lg border border-gray-300 p-2 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    QUEUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    GENERATING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    STAGED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.DRAFT}`}>{status}</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    PRO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    AGENCY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[plan] || colors.FREE}`}>{plan}</span>;
}
