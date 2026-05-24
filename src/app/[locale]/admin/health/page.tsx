'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  Database,
  CreditCard,
  Zap,
} from 'lucide-react';

interface QueueJob {
  id: string;
  appName: string;
  slug: string;
  lastJobId: string | null;
  updatedAt: string;
  user: { email: string };
}

interface FailedJob {
  id: string;
  appName: string;
  slug: string;
  failureReason: string | null;
  retryCount: number;
  lastJobId: string | null;
  updatedAt: string;
  user: { email: string };
}

interface HealthData {
  queue: {
    queuedJobs: QueueJob[];
    generatingJobs: QueueJob[];
    queuedCount: number;
    generatingCount: number;
  };
  failures: {
    failedJobs: FailedJob[];
    recentFailedCount: number;
  };
  system: {
    qstashConfigured: boolean;
    recentSuccessful: number;
    totalEventsToday: number;
    statusBreakdown: Array<{ status: string; count: number }>;
    stripeConfigured: boolean;
    databaseConnected: boolean;
  };
}

export default function AdminHealthPage() {
  const t = useTranslations();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      if (data.data) setHealth(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  const handleRetry = async (appId: string) => {
    setRetrying(appId);
    try {
      const res = await fetch(`/api/admin/apps/${appId}/retry`, { method: 'POST' });
      if (res.ok) {
        // Refresh health data
        await fetchHealth();
      }
    } catch { /* ignore */ }
    finally { setRetrying(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!health) {
    return <div className="text-center py-20 text-gray-500">{t('admin.loadError')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          <Activity className="inline mr-2 h-6 w-6" />
          {t('admin.health.title')}
        </h1>
        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <RefreshCw size={14} /> {t('admin.health.refresh')}
        </button>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SystemIndicator
          label={t('admin.health.database')}
          ok={health.system.databaseConnected}
          icon={<Database size={16} />}
        />
        <SystemIndicator
          label={t('admin.health.stripe')}
          ok={health.system.stripeConfigured}
          icon={<CreditCard size={16} />}
        />
        <SystemIndicator
          label={t('admin.health.qstash')}
          ok={health.system.qstashConfigured}
          icon={<Zap size={16} />}
          optional
        />
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-xs font-medium text-gray-500">{t('admin.health.eventsToday')}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{health.system.totalEventsToday}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('admin.health.statusBreakdown')}
        </h2>
        <div className="flex flex-wrap gap-4">
          {health.system.statusBreakdown.map((s) => (
            <div key={s.status} className="flex items-center gap-2">
              <StatusDot status={s.status} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{s.status}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{s.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-sm text-gray-500">
          {t('admin.health.recentSuccessful')}: <strong>{health.system.recentSuccessful}</strong> (7d)
          {' · '}
          {t('admin.health.recentFailed')}: <strong>{health.failures.recentFailedCount}</strong> (7d)
        </div>
      </div>

      {/* Active Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Queued Jobs */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Clock size={18} className="text-blue-500" />
            {t('admin.health.queuedJobs')} ({health.queue.queuedCount})
          </h2>
          {health.queue.queuedJobs.length > 0 ? (
            <div className="space-y-3">
              {health.queue.queuedJobs.map((j) => (
                <QueueJobItem key={j.id} job={j} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-600">✓ {t('admin.health.queueEmpty')}</p>
          )}
        </div>

        {/* Generating Jobs */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Loader2 size={18} className="text-amber-500 animate-spin" />
            {t('admin.health.generatingJobs')} ({health.queue.generatingCount})
          </h2>
          {health.queue.generatingJobs.length > 0 ? (
            <div className="space-y-3">
              {health.queue.generatingJobs.map((j) => (
                <QueueJobItem key={j.id} job={j} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t('admin.health.noActiveJobs')}</p>
          )}
        </div>
      </div>

      {/* Failed Jobs */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <AlertTriangle size={18} className="text-red-500" />
          {t('admin.health.failedJobs')} ({health.failures.failedJobs.length})
        </h2>
        {health.failures.failedJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 pr-4 font-medium text-gray-500">{t('admin.apps.name')}</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500">{t('admin.apps.owner')}</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500">{t('admin.health.reason')}</th>
                  <th className="pb-3 pr-4 font-medium text-gray-500">{t('admin.health.retries')}</th>
                  <th className="pb-3 font-medium text-gray-500">{t('admin.health.action')}</th>
                </tr>
              </thead>
              <tbody>
                {health.failures.failedJobs.map((j) => (
                  <tr key={j.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900 dark:text-white">{j.appName}</p>
                      <p className="text-xs text-gray-400">/{j.slug}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{j.user.email}</td>
                    <td className="py-3 pr-4">
                      <p className="text-xs text-red-500 max-w-[200px] truncate">{j.failureReason || 'Unknown'}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{j.retryCount}</td>
                    <td className="py-3">
                      <button
                        onClick={() => handleRetry(j.id)}
                        disabled={retrying === j.id}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        {retrying === j.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        {t('admin.health.retry')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-green-600">✓ {t('admin.overview.noFailures')}</p>
        )}
      </div>
    </div>
  );
}

function SystemIndicator({ label, ok, icon, optional }: { label: string; ok: boolean; icon: React.ReactNode; optional?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {ok ? (
          <CheckCircle size={16} className="text-green-500" />
        ) : optional ? (
          <span className="text-xs text-gray-400">N/A</span>
        ) : (
          <XCircle size={16} className="text-red-500" />
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED: 'bg-green-500',
    DRAFT: 'bg-gray-400',
    QUEUED: 'bg-blue-500',
    GENERATING: 'bg-amber-500',
    FAILED: 'bg-red-500',
    STAGED: 'bg-amber-400',
  };
  return <span className={`inline-block h-3 w-3 rounded-full ${colors[status] || 'bg-gray-400'}`} />;
}

function QueueJobItem({ job }: { job: QueueJob }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{job.appName}</p>
        <p className="text-xs text-gray-500">{job.user.email}</p>
      </div>
      <span className="text-xs text-gray-400">
        {new Date(job.updatedAt).toLocaleTimeString()}
      </span>
    </div>
  );
}


