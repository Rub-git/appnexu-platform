/**
 * GET /api/apps/[id]/apk-status
 * Get APK build status.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
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
        apkLastBuiltAt: true,
        apkBuildSize: true,
        apkBuildLog: true,
        apkErrorMessage: true,
        status: true,
      },
    });

    if (!app) return apiError('App not found', 404, 'NOT_FOUND');

    logger.info('apk-status', 'APK status authorization check', {
      sessionUserId: session.user.id,
      sessionEmail: session.user.email || requester.email,
      sessionRole,
      appId: id,
      appOwnerUserId: app.userId,
      appStatus: app.status,
    });

    if (!isAdmin && app.userId !== session.user.id) {
      logger.warn('apk-status', 'Forbidden: user does not own app', {
        reason: 'OWNERSHIP_REQUIRED',
        forbiddenReason: 'OWNERSHIP_REQUIRED',
        appId: id,
        sessionUserId: session.user.id,
        sessionEmail: session.user.email || requester.email,
        sessionRole,
        appOwnerUserId: app.userId,
        appStatus: app.status,
      });
      return apiError('Forbidden: you can only view APK status for your own apps', 403, 'FORBIDDEN');
    }

    return apiSuccess({
      status: app.apkBuildStatus,
      downloadUrl: app.apkBuildUrl,
      lastBuiltAt: app.apkLastBuiltAt,
      size: app.apkBuildSize,
      buildLog: app.apkBuildLog,
      errorMessage: app.apkErrorMessage,
    });
  } catch (error) {
    return apiError('Failed to fetch APK status', 500, 'INTERNAL_ERROR');
  }
}
