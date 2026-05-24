'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AlertTriangle } from 'lucide-react';
import type { Plan } from '@prisma/client';

interface PlanLimitBannerProps {
  plan: Plan;
  limit: number;
}

export default function PlanLimitBanner({ plan, limit }: PlanLimitBannerProps) {
  const t = useTranslations();

  const planName = t(`settings.plan.${plan.toLowerCase()}`);
  const message = limit === 1 
    ? t('plans.limitReached.message', { plan: planName, limit }) 
    : t('plans.limitReached.messagePlural', { plan: planName, limit });

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/20 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-800 dark:text-amber-300">
            {t('plans.limitReached.title')}
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            {message}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            {t('plans.limitReached.upgrade')}
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            {t('plans.limitReached.upgradeButton')}
          </Link>
        </div>
      </div>
    </div>
  );
}
