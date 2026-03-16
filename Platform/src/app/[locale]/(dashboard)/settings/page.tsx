import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { auth, getCurrentUser, PLAN_LIMITS } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { User, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import UpgradeButton from '@/components/UpgradeButton';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const planLimit = PLAN_LIMITS[user.plan];
  const appCount = user._count.apps;
  const usagePercentage = planLimit === Infinity ? 0 : (appCount / planLimit) * 100;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {t('settings.title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Account Information */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <div className="border-b border-gray-200/60 px-6 py-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t('settings.account.title')}
            </h2>
          </div>
        </div>
        <div className="px-6 py-5">
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('settings.account.email')}
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {user.email}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('settings.account.memberSince')}
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {new Date(user.createdAt).toLocaleDateString(locale, { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Plan Information */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <div className="border-b border-gray-200/60 px-6 py-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t('settings.plan.title')}
            </h2>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.plan.current')}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {t(`settings.plan.${user.plan.toLowerCase()}`)}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                user.plan === 'FREE' 
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  : user.plan === 'PRO'
                  ? 'bg-[#178BFF]/10 text-[#178BFF]'
                  : 'bg-[#5B2CCF]/10 text-[#5B2CCF]'
              }`}>
                {t(`settings.plan.${user.plan.toLowerCase()}`)}
              </span>
            </div>

            {/* Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.plan.usage')}
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {planLimit === Infinity 
                    ? `${appCount} ${t('settings.plan.unlimited')}`
                    : t('settings.plan.usageFormat', { used: appCount, limit: planLimit })
                  }
                </p>
              </div>
              {planLimit !== Infinity && (
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      usagePercentage >= 100 ? 'bg-red-500' : 'bg-gradient-to-r from-[#178BFF] to-[#5B2CCF]'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Upgrade CTAs with Stripe */}
            {user.plan !== 'AGENCY' && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-gradient-to-r from-[#178BFF]/5 to-[#5B2CCF]/5 p-4 dark:from-[#178BFF]/10 dark:to-[#5B2CCF]/10">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t('settings.plan.upgradeCta')}
                  </p>
                  <div className="mt-4 space-y-2">
                    {user.plan === 'FREE' && (
                      <UpgradeButton targetPlan="PRO" currentPlan={user.plan} />
                    )}
                    <UpgradeButton targetPlan="AGENCY" currentPlan={user.plan} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <div className="border-b border-gray-200/60 px-6 py-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t('settings.plan.comparison')}
            </h2>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-4">
            {/* Starter (FREE) Plan */}
            <div className={`rounded-2xl p-4 text-center ${
              user.plan === 'FREE' ? 'ring-2 ring-[#178BFF] bg-[#178BFF]/5' : 'bg-gray-50 dark:bg-gray-800'
            }`}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('settings.plan.free')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">$0</p>
              <p className="text-xs text-gray-500">/mo</p>
              <div className="mt-3 space-y-1 text-left text-xs text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> {t('plans.limits.free')}</p>
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> PWA Generation</p>
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Public Link</p>
              </div>
              {user.plan === 'FREE' && (
                <span className="mt-3 inline-block rounded-full bg-[#178BFF]/10 px-2 py-0.5 text-xs font-medium text-[#178BFF]">
                  Current
                </span>
              )}
            </div>

            {/* Pro (PRO) Plan */}
            <div className={`rounded-2xl p-4 text-center ${
              user.plan === 'PRO' ? 'ring-2 ring-[#178BFF] bg-[#178BFF]/5' : 'bg-gray-50 dark:bg-gray-800'
            }`}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('settings.plan.pro')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">$19</p>
              <p className="text-xs text-gray-500">/mo</p>
              <div className="mt-3 space-y-1 text-left text-xs text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> {t('plans.limits.pro')}</p>
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Custom Domain</p>
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Priority Support</p>
              </div>
              {user.plan === 'PRO' && (
                <span className="mt-3 inline-block rounded-full bg-[#178BFF]/10 px-2 py-0.5 text-xs font-medium text-[#178BFF]">
                  Current
                </span>
              )}
            </div>

            {/* Agency (AGENCY) Plan */}
            <div className={`rounded-2xl p-4 text-center ${
              user.plan === 'AGENCY' ? 'ring-2 ring-[#5B2CCF] bg-[#5B2CCF]/5' : 'bg-gray-50 dark:bg-gray-800'
            }`}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('settings.plan.agency')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">$49</p>
              <p className="text-xs text-gray-500">/mo</p>
              <div className="mt-3 space-y-1 text-left text-xs text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> {t('plans.limits.agency')}</p>
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Custom Domain</p>
                <p className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> White Label</p>
              </div>
              {user.plan === 'AGENCY' && (
                <span className="mt-3 inline-block rounded-full bg-[#5B2CCF]/10 px-2 py-0.5 text-xs font-medium text-[#5B2CCF]">
                  Current
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
