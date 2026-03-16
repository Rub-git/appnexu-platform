/**
 * GET /api/admin/stats
 *
 * Returns platform-wide statistics for the admin dashboard overview.
 * Requires ADMIN role.
 *
 * Resilient: returns partial data if some queries fail.
 */
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

/** Safely run a prisma query; returns fallback on error. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel, each with individual error safety
    const [
      totalUsers,
      totalApps,
      totalPublished,
      proUsers,
      agencyUsers,
      recentSignups,
      recentPublished,
      failedJobs,
      queuedJobs,
      generatingJobs,
      recentSignupsList,
      recentPublishedList,
      recentFailedList,
      totalTemplates,
      premiumTemplates,
      mostUsedTemplates,
      totalApkExports,
      failedApkBuilds,
      buildingApks,
      totalAiAnalyses,
      completedAnalyses,
      failedAnalyses,
    ] = await Promise.all([
      safe(() => prisma.user.count(), 0),
      safe(() => prisma.appProject.count(), 0),
      safe(() => prisma.appProject.count({ where: { status: 'PUBLISHED' } }), 0),
      safe(() => prisma.user.count({ where: { plan: 'PRO' } }), 0),
      safe(() => prisma.user.count({ where: { plan: 'AGENCY' } }), 0),
      safe(() => prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }), 0),
      safe(() => prisma.appProject.count({ where: { status: 'PUBLISHED', lastGeneratedAt: { gte: sevenDaysAgo } } }), 0),
      safe(() => prisma.appProject.count({ where: { status: 'FAILED' } }), 0),
      safe(() => prisma.appProject.count({ where: { status: 'QUEUED' } }), 0),
      safe(() => prisma.appProject.count({ where: { status: 'GENERATING' } }), 0),
      safe(() => prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, plan: true, role: true, createdAt: true },
      }), []),
      safe(() => prisma.appProject.findMany({
        where: { status: 'PUBLISHED', lastGeneratedAt: { gte: thirtyDaysAgo } },
        orderBy: { lastGeneratedAt: 'desc' },
        take: 10,
        select: { id: true, appName: true, slug: true, lastGeneratedAt: true, user: { select: { email: true } } },
      }), []),
      safe(() => prisma.appProject.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, appName: true, slug: true, failureReason: true, retryCount: true, updatedAt: true, user: { select: { email: true } } },
      }), []),
      safe(() => prisma.appTemplate.count(), 0),
      safe(() => prisma.appTemplate.count({ where: { isPremium: true } }), 0),
      safe(() => prisma.appTemplate.findMany({
        orderBy: { usageCount: 'desc' },
        take: 5,
        select: { name: true, slug: true, usageCount: true, category: true },
      }), []),
      safe(() => prisma.appProject.count({ where: { apkBuildStatus: 'READY' } }), 0),
      safe(() => prisma.appProject.count({ where: { apkBuildStatus: 'FAILED' } }), 0),
      safe(() => prisma.appProject.count({ where: { apkBuildStatus: 'BUILDING' } }), 0),
      safe(() => prisma.appProject.count({ where: { aiAnalysisStatus: { not: 'NOT_ANALYZED' } } }), 0),
      safe(() => prisma.appProject.count({ where: { aiAnalysisStatus: 'COMPLETED' } }), 0),
      safe(() => prisma.appProject.count({ where: { aiAnalysisStatus: 'FAILED' } }), 0),
    ]);

    return apiSuccess({
      totals: {
        users: totalUsers,
        apps: totalApps,
        publishedApps: totalPublished,
        proUsers,
        agencyUsers,
        recentSignups,
        recentPublished,
        failedJobs,
        queuedJobs,
        generatingJobs,
      },
      templates: {
        total: totalTemplates,
        premium: premiumTemplates,
        mostUsed: mostUsedTemplates,
      },
      apkBuilds: {
        totalExports: totalApkExports,
        failedBuilds: failedApkBuilds,
        buildQueue: buildingApks,
      },
      aiAnalysis: {
        totalRequests: totalAiAnalyses,
        completed: completedAnalyses,
        failed: failedAnalyses,
        completionRate: totalAiAnalyses > 0
          ? Math.round((completedAnalyses / totalAiAnalyses) * 100)
          : 0,
      },
      recentSignups: recentSignupsList,
      recentPublished: recentPublishedList,
      recentFailed: recentFailedList,
    });
  } catch (error) {
    logger.error('admin-stats', 'Failed to fetch admin stats', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to fetch admin stats', 500, 'INTERNAL_ERROR');
  }
}
