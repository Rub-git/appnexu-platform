/**
 * POST /api/internal/apk-build-complete
 * Secure callback from GitHub Actions APK worker.
 *
 * Payload:
 * {
 *   appId: string;
 *   success: boolean;
 *   apkUrl?: string;
 *   size?: number;
 *   error?: string;
 *   logUrl?: string;
 * }
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.APK_BUILD_SECRET;
    if (!secret) {
      logger.error('apk-build-complete', 'Missing APK_BUILD_SECRET env var');
      return apiError('Server misconfiguration', 500, 'INTERNAL_ERROR');
    }

    const providedSecret = request.headers.get('x-apk-build-secret');
    if (!providedSecret || providedSecret !== secret) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    let body: {
      appId?: string;
      success?: boolean;
      apkUrl?: string;
      size?: number;
      error?: string;
      logUrl?: string;
    };

    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'BAD_REQUEST');
    }

    const { appId, success, apkUrl, size, error, logUrl } = body;

    if (!appId || typeof appId !== 'string') {
      return apiError('Missing appId', 400, 'BAD_REQUEST');
    }
    if (typeof success !== 'boolean') {
      return apiError('Missing success boolean', 400, 'BAD_REQUEST');
    }

    const app = await prisma.appProject.findUnique({
      where: { id: appId },
      select: { id: true, apkBuildStatus: true },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (success) {
      if (!apkUrl || typeof apkUrl !== 'string' || !apkUrl.startsWith('https://')) {
        return apiError('Missing or invalid apkUrl', 400, 'BAD_REQUEST');
      }

      await prisma.appProject.update({
        where: { id: appId },
        data: {
          apkBuildStatus: 'READY',
          apkBuildUrl: apkUrl,
          apkBuildSize: typeof size === 'number' ? Math.max(0, Math.floor(size)) : null,
          apkLastBuiltAt: new Date(),
          apkBuildLog: logUrl || null,
          apkErrorMessage: null,
        },
      });

      logger.info('apk-build-complete', 'APK build completed', {
        appId,
        apkUrl,
        size,
        logUrl,
      });
      return apiSuccess({ status: 'READY' });
    }

    await prisma.appProject.update({
      where: { id: appId },
      data: {
        apkBuildStatus: 'FAILED',
        apkBuildLog: logUrl || null,
        apkErrorMessage: error || 'APK build failed',
      },
    });

    logger.warn('apk-build-complete', 'APK build failed', {
      appId,
      error,
      logUrl,
    });
    return apiSuccess({ status: 'FAILED' });
  } catch (err) {
    logger.error('apk-build-complete', 'Unexpected callback error', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiError('Failed to process callback', 500, 'INTERNAL_ERROR');
  }
}
