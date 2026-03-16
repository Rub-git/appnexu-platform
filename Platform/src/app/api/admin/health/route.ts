/**
 * GET /api/admin/health
 * 
 * Returns queue and system health information.
 * Requires ADMIN role.
 */
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { isQStashConfigured } from '@/lib/queue';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      queuedJobs,
      generatingJobs,
      failedJobs,
      recentFailed,
      recentSuccessful,
      totalEventsToday,
      statusBreakdown,
    ] = await Promise.all([
      prisma.appProject.findMany({
        where: { status: 'QUEUED' },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          appName: true,
          slug: true,
          lastJobId: true,
          updatedAt: true,
          user: { select: { email: true } },
        },
      }),
      prisma.appProject.findMany({
        where: { status: 'GENERATING' },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          appName: true,
          slug: true,
          lastJobId: true,
          updatedAt: true,
          user: { select: { email: true } },
        },
      }),
      prisma.appProject.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          appName: true,
          slug: true,
          failureReason: true,
          retryCount: true,
          lastJobId: true,
          updatedAt: true,
          user: { select: { email: true } },
        },
      }),
      // Recently failed (last 7 days)
      prisma.appProject.count({
        where: {
          status: 'FAILED',
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      // Recently successful (last 7 days)
      prisma.appProject.count({
        where: {
          status: 'PUBLISHED',
          lastGeneratedAt: { gte: sevenDaysAgo },
        },
      }),
      // Analytics events today
      prisma.appAnalyticsEvent.count({
        where: { timestamp: { gte: oneDayAgo } },
      }),
      // Status breakdown
      prisma.appProject.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    return apiSuccess({
      queue: {
        queuedJobs,
        generatingJobs,
        queuedCount: queuedJobs.length,
        generatingCount: generatingJobs.length,
      },
      failures: {
        failedJobs,
        recentFailedCount: recentFailed,
      },
      system: {
        qstashConfigured: isQStashConfigured(),
        recentSuccessful,
        totalEventsToday,
        statusBreakdown: statusBreakdown.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
        databaseConnected: true, // If we got here, DB is fine
      },
    });
  } catch (error) {
    return apiError('Failed to fetch health data', 500, 'INTERNAL_ERROR');
  }
}
