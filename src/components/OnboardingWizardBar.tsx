'use client';

import { CheckCircle2 } from 'lucide-react';

type WizardStep = {
  id: number;
  label: string;
};

interface OnboardingWizardBarProps {
  currentStep: number;
  steps: WizardStep[];
}

export default function OnboardingWizardBar({ currentStep, steps }: OnboardingWizardBarProps) {
  const total = steps.length;
  const progress = Math.max(0, Math.min(100, (currentStep / total) * 100));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Onboarding guiado</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Paso {currentStep} de {total}</p>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-2 rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {steps.map((step) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold shadow-sm dark:bg-slate-800">
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.id}
              </span>
              <span className="leading-tight">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
