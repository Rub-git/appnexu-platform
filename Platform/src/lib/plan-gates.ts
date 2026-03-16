import 'server-only';

/**
 * Plan gating utilities.
 * All premium-feature checks MUST go through these helpers so enforcement
 * is centralised and impossible to bypass from the client.
 */

import { prisma } from './prisma';
import type { Plan } from '@prisma/client';

// ─── Feature flags per plan ──────────────────────────────────────────

export const PLAN_FEATURES = {
  FREE: {
    premiumTemplates: false,
    aiAnalysisQuota: 5,      // per calendar month
    apkExport: false,
  },
  PRO: {
    premiumTemplates: true,
    aiAnalysisQuota: Infinity,
    apkExport: true,
  },
  AGENCY: {
    premiumTemplates: true,
    aiAnalysisQuota: Infinity,
    apkExport: true,
  },
} as const satisfies Record<Plan, unknown>;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Fetch the user's current plan (returns 'FREE' if not found). */
export async function getUserPlan(userId: string): Promise<Plan> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return user?.plan ?? 'FREE';
}

/** Can the user use a premium template? */
export function canUsePremiumTemplate(plan: Plan): boolean {
  return PLAN_FEATURES[plan].premiumTemplates;
}

/** Can the user export APK? */
export function canExportApk(plan: Plan): boolean {
  return PLAN_FEATURES[plan].apkExport;
}

/**
 * Check whether the user still has AI analysis quota this month.
 * Returns { allowed, used, limit }.
 */
export async function checkAiAnalysisQuota(
  userId: string,
  plan: Plan,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = PLAN_FEATURES[plan].aiAnalysisQuota;
  if (limit === Infinity) return { allowed: true, used: 0, limit: -1 };

  // Count analyses this calendar month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await prisma.appProject.count({
    where: {
      userId,
      aiAnalysisStatus: { in: ['COMPLETED', 'FAILED', 'ANALYZING'] },
      updatedAt: { gte: startOfMonth },
    },
  });

  return { allowed: used < limit, used, limit };
}
