/**
 * POST /api/apps/[id]/export-apk
 * Trigger APK build for a published app.
 *
 * Security:  auth + ownership + plan gate + rate-limit
 * Reliability: idempotent status lock, cleanup on failure
 *
 * ⚠️  PRODUCTION NOTE: The actual build runs inline (synchronously).
 *     On Vercel Hobby (10s timeout) this WILL fail for complex builds.
 *     See APK_EXPORT.md for recommended async architecture.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { buildApk } from '@/lib/apk-builder';
import { checkRateLimit } from '@/lib/rate-limit';
import { getUserPlan, canExportApk } from '@/lib/plan-gates';

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

    // ── Rate limit: 5 builds per day per user ────────────────────
    const rl = checkRateLimit(`apk:${session.user.id}`, { max: 5, windowSec: 86_400 });
    if (!rl.allowed) {
      return apiError('Too many APK build requests today. Please try again tomorrow.', 429, 'RATE_LIMITED');
    }

    // ── Fetch & ownership ────────────────────────────────────────
    const app = await prisma.appProject.findUnique({ where: { id } });
    if (!app) return apiError('App not found', 404, 'NOT_FOUND');
    if (app.userId !== session.user.id) return apiError('Forbidden', 403, 'FORBIDDEN');

    // ── Plan gate ────────────────────────────────────────────────
    const plan = await getUserPlan(session.user.id);
    if (!canExportApk(plan)) {
      return apiError(
        'APK export requires a PRO or AGENCY plan. Please upgrade.',
        403,
        'PLAN_RESTRICTED',
      );
    }

    // ── Only published apps ──────────────────────────────────────
    if (app.status !== 'PUBLISHED') {
      return apiError('App must be published before exporting APK', 400, 'NOT_PUBLISHED');
    }

    // ── Prevent double building (idempotent) ─────────────────────
    if (app.apkBuildStatus === 'BUILDING') {
      return apiError('APK build already in progress', 409, 'ALREADY_BUILDING');
    }

    // ── Mark as building ─────────────────────────────────────────
    await prisma.appProject.update({
      where: { id },
      data: { apkBuildStatus: 'BUILDING' },
    });

    // ── Build APK (inline) ───────────────────────────────────────
    try {
      const result = await buildApk(app);

      await prisma.appProject.update({
        where: { id },
        data: {
          apkBuildStatus: 'READY',
          apkBuildUrl: result.downloadUrl,
          apkLastBuiltAt: new Date(),
        },
      });

      logger.info('apk-export', 'APK build completed', { appId: id });
      return apiSuccess({ status: 'READY', downloadUrl: result.downloadUrl });
    } catch (buildError) {
      // Reset to safe state so user can retry
      await prisma.appProject.update({
        where: { id },
        data: { apkBuildStatus: 'FAILED' },
      });
      logger.error('apk-export', 'APK build failed', {
        appId: id,
        error: buildError instanceof Error ? buildError.message : 'Unknown',
      });
      return apiError('APK build failed. Please try again.', 500, 'BUILD_FAILED');
    }
  } catch (error) {
    logger.error('apk-export', 'Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to trigger APK build', 500, 'INTERNAL_ERROR');
  }
}
