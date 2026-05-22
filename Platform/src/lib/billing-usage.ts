import 'server-only';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { Plan, Prisma } from '@prisma/client';

type BillingMetricKey =
  | 'apps_created'
  | 'apps_published'
  | 'app_open'
  | 'install_click';

const PLAN_KEY_BY_USER_PLAN: Record<Plan, string> = {
  FREE: 'starter',
  PRO: 'pro',
  AGENCY: 'business',
};

function getDayPeriodRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

async function ensureUsageSubscription(userId: string): Promise<string | null> {
  const existing = await prisma.billingSubscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'INCOMPLETE'] },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  if (existing) return existing.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, stripeCustomerId: true },
  });

  if (!user) return null;

  const planKey = PLAN_KEY_BY_USER_PLAN[user.plan];
  const plan = await prisma.billingPlan.findUnique({
    where: { key: planKey },
    select: { id: true },
  });

  if (!plan) return null;

  const created = await prisma.billingSubscription.create({
    data: {
      userId,
      planId: plan.id,
      status: 'INCOMPLETE',
      stripeCustomerId: user.stripeCustomerId,
      metadata: {
        source: 'auto_usage_tracking',
      },
    },
    select: { id: true },
  });

  return created.id;
}

export async function trackBillingUsage(params: {
  userId: string;
  appId?: string | null;
  metricKey: BillingMetricKey;
  value?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { userId, appId, metricKey, value = 1, metadata } = params;

  try {
    const subscriptionId = await ensureUsageSubscription(userId);
    if (!subscriptionId) return;

    const { start, end } = getDayPeriodRange();

    // Compact aggregation: one row per day+metric (+scope) instead of one row per event.
    const appScope = appId || null;
    const existing = await prisma.billingUsage.findFirst({
      where: {
        subscriptionId,
        userId,
        appId: appScope,
        metricKey,
        periodStart: start,
        periodEnd: end,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.billingUsage.update({
        where: { id: existing.id },
        data: {
          value: { increment: value },
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
      return;
    }

    await prisma.billingUsage.create({
      data: {
        subscriptionId,
        userId,
        appId: appScope,
        metricKey,
        value,
        periodStart: start,
        periodEnd: end,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    logger.warn('billing.usage', 'Failed to track usage event', {
      userId,
      appId,
      metricKey,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}
