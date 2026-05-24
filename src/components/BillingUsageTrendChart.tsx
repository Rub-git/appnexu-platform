'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TrendRow = {
  day: string;
  apps_created: number;
  apps_published: number;
  app_open: number;
  install_click: number;
};

type TrendChartRow = TrendRow & {
  total: number;
  shortDate: string;
};

const BILLING_TREND_PREFS_KEY = 'appnexu.billing.trendPrefs.v1';

type MetricVisibility = {
  app_open: boolean;
  install_click: boolean;
  apps_created: boolean;
  apps_published: boolean;
};

type BillingTrendPrefs = {
  period: 7 | 30;
  visibleMetrics: MetricVisibility;
};

function readStoredPrefs(): Partial<BillingTrendPrefs> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(BILLING_TREND_PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<BillingTrendPrefs>;
  } catch {
    return {};
  }
}

function toShortDate(day: string, locale: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

function sumTotal(row: TrendRow): number {
  return row.apps_created + row.apps_published + row.app_open + row.install_click;
}

export default function BillingUsageTrendChart({
  rows,
  locale,
}: {
  rows: TrendRow[];
  locale: string;
}) {
  const [period, setPeriod] = useState<7 | 30>(() => {
    const parsed = readStoredPrefs();
    return parsed.period === 7 || parsed.period === 30 ? parsed.period : 7;
  });

  const [visibleMetrics, setVisibleMetrics] = useState<MetricVisibility>(() => {
    const parsed = readStoredPrefs();
    const vm = parsed.visibleMetrics;

    return {
      app_open: typeof vm?.app_open === 'boolean' ? vm.app_open : true,
      install_click: typeof vm?.install_click === 'boolean' ? vm.install_click : true,
      apps_created: typeof vm?.apps_created === 'boolean' ? vm.apps_created : false,
      apps_published: typeof vm?.apps_published === 'boolean' ? vm.apps_published : false,
    };
  });

  useEffect(() => {
    try {
      const prefs: BillingTrendPrefs = {
        period,
        visibleMetrics,
      };
      window.localStorage.setItem(BILLING_TREND_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore write failures (private mode, quota exceeded, etc.).
    }
  }, [period, visibleMetrics]);

  const filtered = useMemo<TrendChartRow[]>(() => {
    if (rows.length === 0) return [];

    const latest = new Date(`${rows[0].day}T00:00:00Z`).getTime();
    const threshold = latest - (period - 1) * 24 * 60 * 60 * 1000;

    return rows
      .filter((row) => new Date(`${row.day}T00:00:00Z`).getTime() >= threshold)
      .map((row) => ({
        ...row,
        total: sumTotal(row),
        shortDate: toShortDate(row.day, locale),
      }))
      .reverse();
  }, [rows, period, locale]);

  const totalInPeriod = filtered.reduce((acc, row) => acc + row.total, 0);

  const metricOptions: Array<{
    key: 'app_open' | 'install_click' | 'apps_created' | 'apps_published';
    label: string;
    color: string;
  }> = [
    { key: 'app_open', label: 'Aperturas', color: '#2563eb' },
    { key: 'install_click', label: 'Instalaciones', color: '#9333ea' },
    { key: 'apps_created', label: 'Apps creadas', color: '#0f766e' },
    { key: 'apps_published', label: 'Apps publicadas', color: '#ea580c' },
  ];

  function toggleMetric(metricKey: 'app_open' | 'install_click' | 'apps_created' | 'apps_published') {
    setVisibleMetrics((prev) => ({
      ...prev,
      [metricKey]: !prev[metricKey],
    }));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tendencia de uso</h2>
          <p className="text-xs text-slate-500">Vista compacta de actividad agregada por día.</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPeriod(d as 7 | 30)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                period === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <p className="text-xs text-slate-500">Actividad total en periodo</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalInPeriod}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {metricOptions.map((metric) => {
          const enabled = visibleMetrics[metric.key];

          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => toggleMetric(metric.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                enabled
                  ? 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                  : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
              {metric.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aún no hay datos suficientes para graficar.</p>
      ) : (
        <div className="mt-4 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered}>
              <defs>
                <linearGradient id="usageTotalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip
                labelFormatter={(value) => `Día: ${String(value)}`}
                formatter={(value, key) => {
                  const labels: Record<string, string> = {
                    total: 'Total',
                    app_open: 'Aperturas',
                    install_click: 'Instalaciones',
                    apps_created: 'Apps creadas',
                    apps_published: 'Apps publicadas',
                  };
                  return [String(value), labels[String(key)] || String(key)];
                }}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 30px rgba(2, 6, 23, 0.08)',
                }}
              />
              <Area type="monotone" dataKey="total" stroke="#0ea5e9" fill="url(#usageTotalFill)" strokeWidth={2.5} />
              {visibleMetrics.app_open ? (
                <Line
                  type="monotone"
                  dataKey="app_open"
                  name="Aperturas"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {visibleMetrics.install_click ? (
                <Line
                  type="monotone"
                  dataKey="install_click"
                  name="Instalaciones"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {visibleMetrics.apps_created ? (
                <Line
                  type="monotone"
                  dataKey="apps_created"
                  name="Apps creadas"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {visibleMetrics.apps_published ? (
                <Line
                  type="monotone"
                  dataKey="apps_published"
                  name="Apps publicadas"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
