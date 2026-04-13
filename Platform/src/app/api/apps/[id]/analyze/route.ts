/**
 * POST /api/apps/[id]/analyze
 * Trigger AI analysis for a website.
 *
 * Security:  auth + ownership + plan quota + rate-limit
 * Reliability: timeout, idempotent status reset on failure
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { analyzeWebsiteWithAI } from '@/lib/ai-analyzer';
import { checkRateLimit } from '@/lib/rate-limit';
import { getUserPlan, checkAiAnalysisQuota } from '@/lib/plan-gates';

export const maxDuration = 60; // Extend Vercel Hobby plan timeout
export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth ──────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;

    // ── Rate limit: 10 per hour per user ─────────────────────────
    const rl = checkRateLimit(`analyze:${session.user.id}`, { max: 10, windowSec: 3600 });
    if (!rl.allowed) {
      return apiError('Too many analysis requests. Please try again later.', 429, 'RATE_LIMITED');
    }

    // ── Fetch & ownership ────────────────────────────────────────
    const app = await prisma.appProject.findUnique({ where: { id } });
    if (!app) return apiError('App not found', 404, 'NOT_FOUND');
    if (app.userId !== session.user.id) return apiError('Forbidden', 403, 'FORBIDDEN');

    // ── Plan quota ───────────────────────────────────────────────
    const plan = await getUserPlan(session.user.id);
    const quota = await checkAiAnalysisQuota(session.user.id, plan);
    if (!quota.allowed) {
      return apiError(
        `AI analysis quota exceeded (${quota.used}/${quota.limit} this month). Upgrade your plan for more.`,
        403,
        'QUOTA_EXCEEDED',
      );
    }

    // ── Prevent double analysis ──────────────────────────────────
    if (app.aiAnalysisStatus === 'ANALYZING') {
      return apiError('Analysis already in progress', 409, 'ALREADY_ANALYZING');
    }

    // ── Mark as analyzing ────────────────────────────────────────
    await prisma.appProject.update({
      where: { id },
      data: { aiAnalysisStatus: 'ANALYZING' },
    });

    // ── Run analysis (inline for now; could be queued) ───────────
    try {
      const suggestions = await analyzeWebsiteWithAI(app.targetUrl);

      await prisma.appProject.update({
        where: { id },
        data: {
          aiAnalysisStatus: 'COMPLETED',
          aiSuggestedName: suggestions.name,
          aiSuggestedNavigation: suggestions.navigation as unknown as object,
          aiSuggestedColors: suggestions.colors as unknown as object,
          aiSuggestedActions: suggestions.actions as unknown as object,
        },
      });

      logger.info('ai-analyze', 'Analysis completed', { appId: id });
      return apiSuccess({ status: 'COMPLETED', suggestions });
    } catch (analysisError) {
      // Reset to safe state so user can retry
      await prisma.appProject.update({
        where: { id },
        data: { aiAnalysisStatus: 'FAILED' },
      });
      logger.error('ai-analyze', 'Analysis failed', {
        appId: id,
        error: analysisError instanceof Error ? analysisError.message : 'Unknown',
      });
      return apiError('AI analysis failed. Please try again.', 500, 'ANALYSIS_FAILED');
    }
  } catch (error) {
    logger.error('ai-analyze', 'Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to trigger analysis', 500, 'INTERNAL_ERROR');
  }
}
