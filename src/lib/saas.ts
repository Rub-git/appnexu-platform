import type { AppStatus, Plan } from '@prisma/client';

export type MarketingPlan = 'STARTER' | 'PRO' | 'BUSINESS';

type PlanMeta = {
  marketingName: string;
  appLimit: number;
  supportsCustomDomain: boolean;
  brandingTier: 'basic' | 'premium';
  includesAnalytics: boolean;
  includesFutureExport: boolean;
};

export const PLAN_DISPLAY: Record<Plan, MarketingPlan> = {
  FREE: 'STARTER',
  PRO: 'PRO',
  AGENCY: 'BUSINESS',
};

export const SAAS_PLAN_META: Record<Plan, PlanMeta> = {
  FREE: {
    marketingName: 'Starter',
    appLimit: 1,
    supportsCustomDomain: false,
    brandingTier: 'basic',
    includesAnalytics: false,
    includesFutureExport: false,
  },
  PRO: {
    marketingName: 'Pro',
    appLimit: 10,
    supportsCustomDomain: true,
    brandingTier: 'premium',
    includesAnalytics: false,
    includesFutureExport: false,
  },
  AGENCY: {
    marketingName: 'Business',
    appLimit: Number.POSITIVE_INFINITY,
    supportsCustomDomain: true,
    brandingTier: 'premium',
    includesAnalytics: true,
    includesFutureExport: true,
  },
};

export type SaaSState = 'Draft' | 'Ready' | 'Published' | 'Needs attention';

export function getSaaSState(status: AppStatus): SaaSState {
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'FAILED') return 'Needs attention';
  if (status === 'STAGED' || status === 'QUEUED' || status === 'GENERATING') return 'Ready';
  return 'Draft';
}

export function getSaaSStateTone(state: SaaSState): string {
  if (state === 'Published') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (state === 'Needs attention') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (state === 'Ready') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}