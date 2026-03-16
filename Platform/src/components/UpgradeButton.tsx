'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Zap, Crown } from 'lucide-react';

interface UpgradeButtonProps {
  targetPlan: 'PRO' | 'AGENCY';
  currentPlan: string;
}

export default function UpgradeButton({ targetPlan, currentPlan }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  // Don't show if already on a higher or same plan
  if (
    (targetPlan === 'PRO' && (currentPlan === 'PRO' || currentPlan === 'AGENCY')) ||
    (targetPlan === 'AGENCY' && currentPlan === 'AGENCY')
  ) {
    return null;
  }

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = targetPlan === 'AGENCY' ? Crown : Zap;
  const planPricing = targetPlan === 'PRO' ? '$19/mo' : '$49/mo';

  return (
    <div>
      {error && (
        <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={handleUpgrade}
        disabled={isLoading}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50 ${
          targetPlan === 'AGENCY'
            ? 'bg-gradient-to-r from-[#5B2CCF] to-[#F54291] hover:shadow-md hover:shadow-[#5B2CCF]/25'
            : 'bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] hover:shadow-md hover:shadow-[#178BFF]/25'
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        {isLoading
          ? t('common.loading')
          : `${t('settings.plan.upgradeTo')} ${t(`settings.plan.${targetPlan.toLowerCase()}`)} - ${planPricing}`}
      </button>
    </div>
  );
}
