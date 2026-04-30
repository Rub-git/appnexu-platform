/**
 * POST /api/apk-callback
 * Receives the APK build result from GitHub Actions.
 *
 * Called by the build-apk.yml workflow after:
 *   - Successful APK upload to Vercel Blob  → status READY + download_url
 *   - Build failure                          → status FAILED + error_message
 *
 * Authentication: shared secret via x-apk-build-secret header.
 *
 * Body (JSON):
 *   {
 *     app_id:        string;
 *     status:        "READY" | "FAILED";
 *     download_url?: string;   // present when READY
 *     error_message?: string;  // present when FAILED
 *   }
 */
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // ── Authenticate callback ─────────────────────────────────────
    const secret = process.env.APK_BUILD_SECRET;
    if (!secret) {
      logger.error('apk-callback', 'APK_BUILD_SECRET env var not set');
      return apiError('Server misconfiguration', 500, 'INTERNAL_ERROR');
    }

    const providedSecret = request.headers.get('x-apk-build-secret');
    if (!providedSecret || providedSecret !== secret) {
      logger.warn('apk-callback', 'Invalid callback secret', {
        hasSecret: !!providedSecret,
      });
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // ── Parse body ────────────────────────────────────────────────
    let body: {
      app_id?: string;
      status?: string;
      download_url?: string;
      error_message?: string;
    };

    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'BAD_REQUEST');
    }

    const { app_id, status, download_url, error_message } = body;

    if (!app_id || typeof app_id !== 'string') {
      return apiError('Missing app_id', 400, 'BAD_REQUEST');
    }
    if (status !== 'READY' && status !== 'FAILED') {
      return apiError('Invalid status — must be READY or FAILED', 400, 'BAD_REQUEST');
    }
    if (status === 'READY' && (!download_url || typeof download_url !== 'string')) {
      return apiError('Missing download_url for READY status', 400, 'BAD_REQUEST');
    }
    if (status === 'READY' && !download_url!.startsWith('https://')) {
      return apiError('download_url must be an HTTPS URL', 400, 'BAD_REQUEST');
    }

    // ── Verify the app exists and is still BUILDING ───────────────
    const app = await prisma.appProject.findUnique({
      where: { id: app_id },
      select: { id: true, apkBuildStatus: true, appName: true },
    });

    if (!app) {
      logger.warn('apk-callback', 'App not found in callback', { app_id });
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (app.apkBuildStatus !== 'BUILDING') {
      // Already settled — idempotent, return success without update
      logger.info('apk-callback', 'Received callback for non-BUILDING app (ignored)', {
        app_id,
        currentStatus: app.apkBuildStatus,
        callbackStatus: status,
      });
      return apiSuccess({ ignored: true });
    }

    // ── Update build status ───────────────────────────────────────
    if (status === 'READY') {
      await prisma.appProject.update({
        where: { id: app_id },
        data: {
          apkBuildStatus: 'READY',
          apkBuildUrl: download_url,
          apkLastBuiltAt: new Date(),
          apkErrorMessage: null,
        },
      });

      logger.info('apk-callback', 'APK build marked READY', {
        app_id,
        download_url,
        appName: app.appName,
      });
    } else {
      await prisma.appProject.update({
        where: { id: app_id },
        data: {
          apkBuildStatus: 'FAILED',
          apkErrorMessage: error_message ?? 'Build failed',
        },
      });

      logger.warn('apk-callback', 'APK build marked FAILED', {
        app_id,
        error_message,
        appName: app.appName,
      });
    }

    return apiSuccess({ received: true });
  } catch (error) {
    logger.error('apk-callback', 'Unexpected error processing APK callback', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to process callback', 500, 'INTERNAL_ERROR');
  }
}
