/**
 * GET /api/apps/[id]/apk-status
 * Get APK build status.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    const app = await prisma.appProject.findUnique({
      where: { id },
      select: {
        userId: true,
        apkBuildStatus: true,
        apkBuildUrl: true,
        apkLastBuiltAt: true,
      },
    });

    if (!app) return apiError('App not found', 404, 'NOT_FOUND');
    if (app.userId !== session.user.id) return apiError('Forbidden', 403, 'FORBIDDEN');

    return apiSuccess({
      status: app.apkBuildStatus,
      downloadUrl: app.apkBuildUrl,
      lastBuiltAt: app.apkLastBuiltAt,
    });
  } catch (error) {
    return apiError('Failed to fetch APK status', 500, 'INTERNAL_ERROR');
  }
}
