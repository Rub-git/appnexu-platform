import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';

const ADMIN_APPS_SUMMARY_TTL_SECONDS = 180;

export function adminAppsSummaryTag() {
  return 'admin:apps:summary';
}

export type AdminAppsSummary = {
  totalApps: number;
  publishedApps: number;
  failedApps: number;
  customDomainApps: number;
  totalVisits: number;
  totalInstalls: number;
};

export async function getAdminAppsSummaryCached(): Promise<AdminAppsSummary> {
  const cachedFetcher = unstable_cache(
    async () => {
      const [totalApps, customDomainApps, aggregate, groupedByStatus] = await Promise.all([
        prisma.appProject.count(),
        prisma.appProject.count({ where: { customDomain: { not: null } } }),
        prisma.appProject.aggregate({
          _sum: {
            totalVisits: true,
            totalInstalls: true,
          },
        }),
        prisma.appProject.groupBy({
          by: ['status'],
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
        totalApps,
        publishedApps: statusCounts.PUBLISHED ?? 0,
        failedApps: statusCounts.FAILED ?? 0,
        customDomainApps,
        totalVisits: aggregate._sum.totalVisits ?? 0,
        totalInstalls: aggregate._sum.totalInstalls ?? 0,
      };
    },
    ['admin-apps-summary:v1'],
    {
      tags: [adminAppsSummaryTag()],
      revalidate: ADMIN_APPS_SUMMARY_TTL_SECONDS,
    },
  );

  return cachedFetcher();
}

export async function revalidateAdminAppsSummary() {
  revalidateTag(adminAppsSummaryTag(), 'max');
}
