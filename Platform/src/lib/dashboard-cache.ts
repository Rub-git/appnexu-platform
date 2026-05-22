import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';

const DASHBOARD_SUMMARY_TTL_SECONDS = 300;

export function dashboardSummaryTag(userId: string) {
  return `dashboard:summary:${userId}`;
}

type DashboardSummary = {
  totalVisits: number;
  totalOpens: number;
  totalInstalls: number;
  latestPublishedAt: Date | null;
  statusCounts: Record<string, number>;
  publishedApps: number;
};

export async function getDashboardSummaryCached(userId: string): Promise<DashboardSummary> {
  const cachedFetcher = unstable_cache(
    async () => {
      const [aggregate, groupedByStatus] = await Promise.all([
        prisma.appProject.aggregate({
          where: { userId },
          _sum: {
            totalVisits: true,
            uniqueVisitors: true,
            totalInstalls: true,
          },
          _max: {
            lastPublishedAt: true,
          },
        }),
        prisma.appProject.groupBy({
          by: ['status'],
          where: { userId },
          _count: {
            _all: true,
          },
        }),
      ]);

      const statusCounts = groupedByStatus.reduce<Record<string, number>>((acc, group) => {
        acc[group.status] = group._count._all;
        return acc;
      }, {});

      return {
        totalVisits: aggregate._sum.totalVisits ?? 0,
        totalOpens: aggregate._sum.uniqueVisitors ?? 0,
        totalInstalls: aggregate._sum.totalInstalls ?? 0,
        latestPublishedAt: aggregate._max.lastPublishedAt,
        statusCounts,
        publishedApps: statusCounts.PUBLISHED ?? 0,
      };
    },
    [`dashboard-summary:${userId}`],
    {
      tags: [dashboardSummaryTag(userId)],
      revalidate: DASHBOARD_SUMMARY_TTL_SECONDS,
    },
  );

  return cachedFetcher();
}

export async function revalidateDashboardSummary(userId: string) {
  revalidateTag(dashboardSummaryTag(userId), 'max');
}
