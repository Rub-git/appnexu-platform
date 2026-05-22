import { setRequestLocale } from 'next-intl/server';
import { auth, canCreateApp } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { SAAS_PLAN_META } from '@/lib/saas';
import { CheckCircle2, Clock3, Gauge, CreditCard } from 'lucide-react';
import BillingUsageTrendChart from '@/components/BillingUsageTrendChart';

function metricLabel(metricKey: string): string {
  if (metricKey === 'apps_created') return 'Apps creadas';
  if (metricKey === 'apps_published') return 'Apps publicadas';
  if (metricKey === 'app_open') return 'Aperturas';
  if (metricKey === 'install_click') return 'Instalaciones';
  return metricKey;
}

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const usage = await canCreateApp(session.user.id);
  const currentPlan = usage.plan as 'FREE' | 'PRO' | 'AGENCY';
  const planMeta = SAAS_PLAN_META[currentPlan];

  const latestSubscription = await prisma.billingSubscription.findFirst({
    where: { userId: session.user.id },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const monthlyUsageRows = await prisma.billingUsage.findMany({
    where: {
      userId: session.user.id,
      periodStart: { gte: currentMonthStart },
    },
    orderBy: [{ periodStart: 'desc' }, { metricKey: 'asc' }],
    take: 200,
  });

  const byDay = new Map<string, Record<string, number>>();
  for (const row of monthlyUsageRows) {
    const dayKey = row.periodStart.toISOString().slice(0, 10);
    const existing = byDay.get(dayKey) || {};
    existing[row.metricKey] = (existing[row.metricKey] || 0) + row.value;
    byDay.set(dayKey, existing);
  }

  const compactDailyRows = Array.from(byDay.entries())
    .map(([day, metrics]) => ({
      day,
      apps_created: metrics.apps_created || 0,
      apps_published: metrics.apps_published || 0,
      app_open: metrics.app_open || 0,
      install_click: metrics.install_click || 0,
    }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          Billing y Suscripción
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Centro de control de plan, límites y uso. Arquitectura lista para Stripe automático en la siguiente fase.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">Plan actual</p>
            <CreditCard className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{planMeta.marketingName}</p>
          <p className="mt-1 text-xs text-slate-500">Internal: {currentPlan}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">Apps usadas</p>
            <Gauge className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {usage.limit === -1 ? `${usage.current} / ilimitadas` : `${usage.current}/${usage.limit}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Remaining: {usage.remaining === -1 ? '∞' : usage.remaining}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">Estado suscripción</p>
            <Clock3 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {latestSubscription?.status || 'Sin suscripción activa'}
          </p>
          <p className="mt-1 text-xs text-slate-500">{latestSubscription?.plan?.displayName || 'Catálogo preparado'}</p>
        </Card>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Límites por plan (soft gating activo)</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <LimitTile name="Starter" apps="1 app" note="Branding básico" />
          <LimitTile name="Pro" apps="Hasta 10 apps" note="Dominio custom + branding premium" featured />
          <LimitTile name="Business" apps="Ilimitadas" note="Analytics básico + base enterprise" />
        </div>
      </section>

      <BillingUsageTrendChart rows={compactDailyRows} locale={locale} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Uso diario compacto</h2>
        <p className="mt-1 text-xs text-slate-500">Agregado por día/métrica para reducir volumen y facilitar lectura.</p>
        {compactDailyRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aún no hay registros de uso medido en BillingUsage para este usuario.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr className="text-left text-slate-600 dark:text-slate-300">
                  <th className="px-3 py-2 font-medium">Día</th>
                  <th className="px-3 py-2 font-medium">{metricLabel('apps_created')}</th>
                  <th className="px-3 py-2 font-medium">{metricLabel('apps_published')}</th>
                  <th className="px-3 py-2 font-medium">{metricLabel('app_open')}</th>
                  <th className="px-3 py-2 font-medium">{metricLabel('install_click')}</th>
                </tr>
              </thead>
              <tbody>
                {compactDailyRows.map((row) => (
                  <tr key={row.day} className="border-t border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    <td className="px-3 py-2 font-medium">{new Date(`${row.day}T00:00:00Z`).toLocaleDateString(locale)}</td>
                    <td className="px-3 py-2">{row.apps_created}</td>
                    <td className="px-3 py-2">{row.apps_published}</td>
                    <td className="px-3 py-2">{row.app_open}</td>
                    <td className="px-3 py-2">{row.install_click}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">{children}</div>;
}

function LimitTile({
  name,
  apps,
  note,
  featured,
}: {
  name: string;
  apps: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${featured ? 'border-cyan-400 bg-cyan-50/40 dark:bg-cyan-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{apps}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {note}
      </p>
    </div>
  );
}
