'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import UpgradeButton from '@/components/UpgradeButton';

export default function PricingPage() {
  const locale = useLocale();
  const isEs = locale === 'es';

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 text-slate-900">
      <h1 className="text-center text-4xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>
        {isEs ? 'Planes SaaS simples y escalables' : 'Simple and scalable SaaS plans'}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
        {isEs
          ? 'Primero construimos tu base comercial: usuarios, apps persistentes, límites claros y upgrade natural.'
          : 'Build your commercial base first: users, persistent apps, clear limits, and natural upgrade paths.'}
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <PlanCard
          name="Starter"
          price="$0"
          locale={locale}
          isEs={isEs}
          perks={[
            isEs ? '1 app' : '1 app',
            isEs ? 'Branding básico' : 'Basic branding',
            isEs ? 'Publicación rápida' : 'Fast publishing',
          ]}
          cta={isEs ? 'Comenzar gratis' : 'Start free'}
        />

        <PlanCard
          name="Pro"
          price="$19/mo"
          locale={locale}
          isEs={isEs}
          targetPlan="PRO"
          featured
          perks={[
            isEs ? 'Múltiples apps' : 'Multiple apps',
            isEs ? 'Dominio personalizado' : 'Custom domain',
            isEs ? 'Branding premium' : 'Premium branding',
          ]}
          cta={isEs ? 'Mejorar a Pro' : 'Upgrade to Pro'}
        />

        <PlanCard
          name="Business"
          price="$49/mo"
          locale={locale}
          isEs={isEs}
          targetPlan="AGENCY"
          perks={[
            isEs ? 'Apps ilimitadas' : 'Unlimited apps',
            isEs ? 'Analytics básico' : 'Basic analytics',
            isEs ? 'Export features futuras' : 'Future export features',
          ]}
          cta={isEs ? 'Escalar a Business' : 'Scale to Business'}
        />
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        {isEs
          ? 'Si faltan precios en Stripe, los upgrades se desactivan automáticamente hasta completar la configuración.'
          : 'If Stripe prices are missing, upgrade actions are automatically disabled until configuration is complete.'}
      </p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  locale,
  isEs,
  perks,
  cta,
  targetPlan,
  featured,
}: {
  name: string;
  price: string;
  locale: string;
  isEs: boolean;
  perks: string[];
  cta: string;
  targetPlan?: 'PRO' | 'AGENCY';
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm ${
        featured
          ? 'border-cyan-500 bg-cyan-50/40 shadow-cyan-100'
          : 'border-slate-200 bg-white'
      }`}
    >
      <h2 className="text-xl font-semibold">{name}</h2>
      <p className="mt-1 text-3xl font-bold">{price}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {perk}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {targetPlan ? (
          <UpgradeButton
            targetPlan={targetPlan}
            currentPlan="FREE"
            locale={locale}
            buttonLabel={cta}
          />
        ) : (
          <Link
            href={`/${locale}/signup`}
            className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
              featured ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-slate-900 hover:bg-black'
            }`}
          >
            {cta}
          </Link>
        )}
        {targetPlan && (
          <p className="mt-2 text-center text-xs text-slate-500">
            {isEs ? 'Requiere sesión iniciada.' : 'Requires an active session.'}
          </p>
        )}
      </div>
    </div>
  );
}
