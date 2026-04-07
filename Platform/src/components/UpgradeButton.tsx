'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Zap, Crown, AlertTriangle } from 'lucide-react';

interface UpgradeButtonProps {
  targetPlan: 'PRO' | 'AGENCY';
  currentPlan: string;
}

export default function UpgradeButton({ targetPlan, currentPlan }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{
    stripeConfigured: boolean;
    proPriceConfigured: boolean;
    agencyPriceConfigured: boolean;
  } | null>(null);
  const t = useTranslations();

  // Don't show if already on a higher or same plan
  if (
    (targetPlan === 'PRO' && (currentPlan === 'PRO' || currentPlan === 'AGENCY')) ||
    (targetPlan === 'AGENCY' && currentPlan === 'AGENCY')
  ) {
    return null;
  }

  // Pre-check Stripe configuration on mount
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetch('/api/stripe/config')
      .then(res => res.json())
      .then(data => setConfigStatus(data))
      .catch(() => {}); // silently fail
  }, []);

  const isPriceConfigured = configStatus
    ? (targetPlan === 'PRO' ? configStatus.proPriceConfigured : configStatus.agencyPriceConfigured)
    : true; // assume configured until we know

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
        if (data.code === 'PRICE_NOT_CONFIGURED') {
          throw new Error(
            `Price configuration missing for ${targetPlan} plan. Please contact support.`
          );
        }
        if (data.code === 'STRIPE_NOT_CONFIGURED') {
          throw new Error(
            'Billing is not configured yet. Please contact support.'
          );
        }
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
      {/* Show pre-check warning if price is not configured */}
      {configStatus && !isPriceConfigured && (
        <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            {targetPlan} plan pricing not yet configured. 
            {!configStatus.stripeConfigured && ' Stripe is not connected.'}
          </span>
        </div>
      )}
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
