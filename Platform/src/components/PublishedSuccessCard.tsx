'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';

interface PublishedSuccessCardProps {
  publicUrl: string;
}

export default function PublishedSuccessCard({ publicUrl }: PublishedSuccessCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-slate-900">
      <div className="absolute -right-6 -top-6 h-20 w-20 animate-pulse rounded-full bg-emerald-200/40 blur-2xl dark:bg-emerald-700/20" />
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className="success-confetti"
            style={{
              left: `${8 + index * 9}%`,
              animationDelay: `${index * 0.18}s`,
            }}
          />
        ))}
      </div>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-600 p-2 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-base font-semibold text-emerald-700 dark:text-emerald-300">Tu app ya esta lista 🚀</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ya puedes abrir, instalar y compartir tu app con clientes.</p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Instalable y compartible
          </div>
          <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">{publicUrl}</p>
        </div>
      </div>
    </div>
  );
}
