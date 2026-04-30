/**
 * GET /api/apps/[id]/download-apk
 * Serve the APK archive for download.
 *
 * Security: auth + ownership + status check.
 * The download URL is only valid while the /tmp artifacts exist.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true },
    });
    if (!requester) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const sessionRole = requester.role;
    const isAdmin = sessionRole === 'ADMIN';

    const { id } = await params;
    const app = await prisma.appProject.findUnique({
      where: { id },
      select: {
        userId: true,
        apkBuildStatus: true,
        apkBuildUrl: true,
        appName: true,
        slug: true,
        status: true,
      },
    });

    if (!app) return apiError('App not found', 404, 'NOT_FOUND');

    logger.info('apk-download', 'APK download authorization check', {
      sessionUserId: session.user.id,
      sessionEmail: session.user.email || requester.email,
      sessionRole,
      appId: id,
      appOwnerUserId: app.userId,
      appStatus: app.status,
    });

    if (!isAdmin && app.userId !== session.user.id) {
      logger.warn('apk-download', 'Forbidden: user does not own app', {
        reason: 'OWNERSHIP_REQUIRED',
        forbiddenReason: 'OWNERSHIP_REQUIRED',
        appId: id,
        sessionUserId: session.user.id,
        sessionEmail: session.user.email || requester.email,
        sessionRole,
        appOwnerUserId: app.userId,
        appStatus: app.status,
      });
      return apiError('Forbidden: you can only download APK for your own apps', 403, 'FORBIDDEN');
    }

    if (app.apkBuildStatus !== 'READY') {
      return apiError('APK not available for download', 400, 'NOT_READY');
    }

    // Redirect to Vercel Blob URL (set by /api/apk-callback after GitHub Actions build)
    if (app.apkBuildUrl && app.apkBuildUrl.startsWith('https://')) {
      return NextResponse.redirect(app.apkBuildUrl);
    }

    return apiError(
      'APK build artifacts have expired. Please rebuild.',
      410,
      'BUILD_EXPIRED',
    );
  } catch (error) {
    return apiError('Failed to download APK', 500, 'INTERNAL_ERROR');
  }
}
