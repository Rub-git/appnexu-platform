import { SAAS_PLAN_META } from '@/lib/saas';
import { Link } from '@/i18n/routing';

interface SoftLimitNoticeProps {
  plan: 'FREE' | 'PRO' | 'AGENCY';
  current: number;
  limit: number;
}

export default function SoftLimitNotice({ plan, current, limit }: SoftLimitNoticeProps) {
  const planLabel = SAAS_PLAN_META[plan].marketingName;
  const pct = limit > 0 ? Math.min(Math.round((current / limit) * 100), 100) : 0;

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
      <p className="text-sm font-semibold">Te estás acercando al límite de tu plan {planLabel}</p>
      <p className="mt-1 text-xs opacity-90">
        Uso actual: {current}/{limit} apps ({pct}%). Puedes seguir trabajando, pero conviene mejorar plan para no frenar la publicación.
      </p>
      <Link
        href="/settings"
        className="mt-2 inline-flex rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        Ver upgrade
      </Link>
    </div>
  );
}
