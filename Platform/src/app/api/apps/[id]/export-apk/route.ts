/**
 * POST /api/apps/[id]/export-apk
 * Trigger APK build for a published app via GitHub Actions.
 *
 * Security:  auth + ownership + plan gate + rate-limit
 * The actual build runs on GitHub Actions (ubuntu-latest + Android SDK).
 * Status is QUEUED/BUILDING until GitHub Actions POSTs to
 * /api/internal/apk-build-complete.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { ApkBuilderNotConfiguredError, triggerGitHubActionsApkBuild } from '@/lib/apk-builder';
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
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true, plan: true },
    });
    if (!requester) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const sessionRole = requester.role;
    const isAdmin = sessionRole === 'ADMIN';

    // ── Rate limit: 5 builds per day per user ────────────────────
    const rl = checkRateLimit(`apk:${session.user.id}`, { max: 5, windowSec: 86_400 });
    if (!rl.allowed) {
      return apiError('Too many APK build requests today. Please try again tomorrow.', 429, 'RATE_LIMITED');
    }

    // ── Fetch & ownership ────────────────────────────────────────
    const app = await prisma.appProject.findUnique({ where: { id } });
    if (!app) return apiError('App not found', 404, 'NOT_FOUND');

    logger.info('apk-export', 'APK export authorization check', {
      sessionUserId: session.user.id,
      sessionEmail: session.user.email || requester.email,
      sessionRole,
      appId: app.id,
      appOwnerUserId: app.userId,
      appStatus: app.status,
    });

    if (!isAdmin && app.userId !== session.user.id) {
      logger.warn('apk-export', 'Forbidden: user does not own app', {
        reason: 'OWNERSHIP_REQUIRED',
        forbiddenReason: 'OWNERSHIP_REQUIRED',
        appId: id,
        sessionUserId: session.user.id,
        sessionEmail: session.user.email || requester.email,
        sessionRole,
        appOwnerUserId: app.userId,
        appStatus: app.status,
      });
      return apiError('Forbidden: you can only export APK for your own apps', 403, 'FORBIDDEN');
    }

    // ── Plan gate ────────────────────────────────────────────────
    const plan = requester.plan || await getUserPlan(session.user.id);
    if (!isAdmin && !canExportApk(plan)) {
      logger.warn('apk-export', 'Forbidden: plan restriction', {
        reason: 'PLAN_RESTRICTED',
        forbiddenReason: 'PLAN_RESTRICTED',
        appId: id,
        sessionUserId: session.user.id,
        sessionEmail: session.user.email || requester.email,
        sessionRole,
        appOwnerUserId: app.userId,
        plan,
        appStatus: app.status,
      });
      return apiError(
        'APK export requires Pro plan',
        403,
        'PLAN_RESTRICTED',
      );
    }

    // ── Only published apps ──────────────────────────────────────
    if (app.status !== 'PUBLISHED') {
      logger.warn('apk-export', 'Blocked: app is not published', {
        reason: 'NOT_PUBLISHED',
        forbiddenReason: 'NOT_PUBLISHED',
        appId: id,
        sessionUserId: session.user.id,
        sessionEmail: session.user.email || requester.email,
        sessionRole,
        appOwnerUserId: app.userId,
        plan,
        appStatus: app.status,
      });
      return apiError('App must be published before exporting APK', 400, 'NOT_PUBLISHED');
    }

    // ── Prevent double building (idempotent) ─────────────────────
    if (app.apkBuildStatus === 'BUILDING' || app.apkBuildStatus === 'QUEUED') {
      logger.warn('apk-export', 'Blocked: build already in progress', {
        reason: 'ALREADY_BUILDING',
        forbiddenReason: 'ALREADY_BUILDING',
        appId: id,
        sessionUserId: session.user.id,
        sessionEmail: session.user.email || requester.email,
        sessionRole,
        appOwnerUserId: app.userId,
        plan,
        appStatus: app.status,
      });
      return apiError('APK build already in progress', 409, 'ALREADY_BUILDING');
    }

    // ── Mark as queued ───────────────────────────────────────────
    await prisma.appProject.update({
      where: { id },
      data: {
        apkBuildStatus: 'QUEUED',
        apkBuildUrl: null,
        apkBuildSize: null,
        apkBuildLog: 'Queued for GitHub Actions worker',
        apkErrorMessage: null,
      },
    });

    // ── Dispatch to GitHub Actions ───────────────────────────────
    try {
      await triggerGitHubActionsApkBuild(app);

      await prisma.appProject.update({
        where: { id },
        data: {
          apkBuildStatus: 'BUILDING',
          apkBuildLog: 'Build started on GitHub Actions',
        },
      });

      logger.info('apk-export', 'APK build dispatched to GitHub Actions', { appId: id });
      return apiSuccess({ status: 'BUILDING' });
    } catch (buildError) {
      // Reset so user can retry
      await prisma.appProject.update({
        where: { id },
        data: {
          apkBuildStatus: 'FAILED',
          apkBuildLog: null,
          apkErrorMessage: buildError instanceof Error ? buildError.message : 'Dispatch failed',
        },
      });

      if (buildError instanceof ApkBuilderNotConfiguredError) {
        logger.warn('apk-export', 'APK builder not configured', {
          appId: id,
          error: buildError.message,
        });
        return apiError('APK builder not configured on this server', 503, 'APK_BUILDER_NOT_CONFIGURED');
      }

      logger.error('apk-export', 'APK dispatch failed', {
        appId: id,
        error: buildError instanceof Error ? buildError.message : 'Unknown',
      });
      return apiError('Failed to start APK build. Please try again.', 500, 'BUILD_FAILED');
    }
  } catch (error) {
    logger.error('apk-export', 'Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to trigger APK build', 500, 'INTERNAL_ERROR');
  }
}
