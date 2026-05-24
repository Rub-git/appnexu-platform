'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface BillingUser {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { apps: number };
}

interface BillingSummary {
  planBreakdown: Array<{ plan: string; count: number }>;
  stripeLinkedCount: number;
  totalUsers: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminBillingPage() {
  const t = useTranslations();
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [stripeFilter, setStripeFilter] = useState('');

  const fetchBilling = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);
      if (stripeFilter) params.set('stripeLinked', stripeFilter);

      const res = await fetch(`/api/admin/billing?${params}`);
      const data = await res.json();
      if (data.data) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
        setSummary(data.data.summary);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, planFilter, stripeFilter]);

  useEffect(() => { fetchBilling(1); }, [fetchBilling]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        <CreditCard className="inline mr-2 h-6 w-6" />
        {t('admin.billing.title')}
      </h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summary.planBreakdown.map((p) => (
            <div key={p.plan} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-xs font-medium text-gray-500">{p.plan} {t('admin.users.plan')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{p.count}</p>
            </div>
          ))}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-xs font-medium text-gray-500">{t('admin.billing.stripeLinked')}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.stripeLinkedCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.users.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">{t('admin.filters.allPlans')}</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="AGENCY">AGENCY</option>
        </select>
        <select value={stripeFilter} onChange={(e) => setStripeFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">{t('admin.billing.allStripe')}</option>
          <option value="true">{t('admin.billing.linked')}</option>
          <option value="false">{t('admin.billing.notLinked')}</option>
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
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.users.email')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.users.plan')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.billing.stripeStatus')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.billing.customerId')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.users.apps')}</th>
                <th className="px-4 py-3 font-medium text-gray-500">{t('admin.users.joined')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{u.name || '—'}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                  <td className="px-4 py-3">
                    {u.stripeCustomerId ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle size={12} /> {t('admin.billing.linked')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <XCircle size={12} /> {t('admin.billing.notLinked')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    {u.stripeCustomerId ? u.stripeCustomerId.slice(0, 20) + '...' : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u._count.apps}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('admin.noData')}</td></tr>
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
            <button disabled={pagination.page <= 1} onClick={() => fetchBilling(pagination.page - 1)} className="rounded-lg border border-gray-300 p-2 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <ChevronLeft size={16} />
            </button>
            <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">{pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchBilling(pagination.page + 1)} className="rounded-lg border border-gray-300 p-2 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    PRO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    AGENCY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[plan] || colors.FREE}`}>{plan}</span>;
}
