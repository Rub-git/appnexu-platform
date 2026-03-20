'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { useState } from 'react';

export default function PricingPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: 'PRO' | 'AGENCY') => {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        window.location.href = `/${locale}/signup`;
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      key: 'free' as const,
      icon: <Zap className="h-6 w-6" />,
      features: ['apps', 'basic', 'publishing', 'support'] as const,
      cta: 'getStarted',
      href: `/${locale}/signup`,
      popular: false,
      gradient: 'from-gray-100 to-gray-50',
      iconBg: 'bg-gray-100 text-gray-600',
      border: 'border-gray-200',
      buttonStyle: 'bg-gray-900 hover:bg-gray-800 text-white',
    },
    {
      key: 'pro' as const,
      icon: <Sparkles className="h-6 w-6" />,
      features: ['apps', 'templates', 'ai', 'apk', 'analytics', 'support'] as const,
      cta: 'upgrade',
      popular: true,
      gradient: 'from-[#178BFF]/5 to-[#5B2CCF]/5',
      iconBg: 'bg-[#178BFF]/10 text-[#178BFF]',
      border: 'border-[#178BFF]/30',
      buttonStyle: 'bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] hover:shadow-lg hover:shadow-[#178BFF]/25 text-white',
    },
    {
      key: 'agency' as const,
      icon: <Building2 className="h-6 w-6" />,
      features: ['apps', 'templates', 'ai', 'apk', 'whiteLabel', 'support', 'customDomain', 'analytics'] as const,
      cta: 'upgrade',
      popular: false,
      gradient: 'from-[#5B2CCF]/5 to-[#F54291]/5',
      iconBg: 'bg-[#5B2CCF]/10 text-[#5B2CCF]',
      border: 'border-[#5B2CCF]/30',
      buttonStyle: 'bg-gradient-to-r from-[#5B2CCF] to-[#F54291] hover:shadow-lg hover:shadow-[#5B2CCF]/25 text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {t('nav.signIn')}
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          >
            {t('nav.signUp')}
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="text-center pt-16 pb-12 px-4">
        <h1
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          {t('pricing.title')}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Plans Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 ${plan.border} bg-gradient-to-b ${plan.gradient} p-8 flex flex-col ${
                plan.popular
                  ? 'ring-2 ring-[#178BFF] shadow-xl scale-[1.02]'
                  : 'shadow-sm'
              } transition-all hover:shadow-lg`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-1.5 text-xs font-bold text-white shadow-md">
                    {t('pricing.pro.popular')}
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${plan.iconBg} mb-4`}
                >
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t(`pricing.${plan.key}.name`)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t(`pricing.${plan.key}.description`)}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {t(`pricing.${plan.key}.price`)}
                </span>
                {plan.key !== 'free' && (
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    /{t('pricing.monthly')}
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t(`pricing.${plan.key}.features.${feature}`)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {plan.key === 'free' ? (
                <Link
                  href="/signup"
                  className={`block w-full rounded-xl ${plan.buttonStyle} py-3 text-center font-semibold transition-all`}
                >
                  {t('pricing.getStarted')}
                </Link>
              ) : (
                <button
                  onClick={() =>
                    handleCheckout(plan.key === 'pro' ? 'PRO' : 'AGENCY')
                  }
                  disabled={
                    loading === (plan.key === 'pro' ? 'PRO' : 'AGENCY')
                  }
                  className={`w-full rounded-xl ${plan.buttonStyle} py-3 text-center font-semibold transition-all disabled:opacity-60`}
                >
                  {loading === (plan.key === 'pro' ? 'PRO' : 'AGENCY')
                    ? t('common.loading')
                    : t('pricing.upgrade')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
