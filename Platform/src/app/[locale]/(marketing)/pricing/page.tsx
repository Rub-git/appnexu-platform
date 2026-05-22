'use client';

import { useLocale } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';

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
          ? 'Los cobros automáticos pueden activarse después. Esta fase prioriza arquitectura de billing y límites suaves.'
          : 'Automatic charging can be enabled later. This phase prioritizes billing architecture and soft limits.'}
      </p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  perks,
  cta,
  featured,
}: {
  name: string;
  price: string;
  perks: string[];
  cta: string;
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
      <button
        type="button"
        className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
          featured ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-slate-900 hover:bg-black'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
