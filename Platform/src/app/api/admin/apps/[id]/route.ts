import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// DELETE /api/admin/apps/[id] - Admin delete app
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return apiError('Invalid app ID', 400, 'INVALID_ID');
    }

    const app = await prisma.appProject.findUnique({
      where: { id },
      select: {
        id: true,
        appName: true,
        targetUrl: true,
        customDomain: true,
        totalVisits: true,
        uniqueVisitors: true,
        totalInstalls: true,
      },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    await prisma.appProject.delete({ where: { id } });

    logger.info('admin.apps', 'Admin deleted app', {
      adminId: admin.id,
      appId: app.id,
      appName: app.appName,
      targetUrl: app.targetUrl,
      customDomain: app.customDomain,
    });

    return apiSuccess({ deletedApp: app });
  } catch (error) {
    logger.error('admin.apps', 'Failed to delete app', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to delete app', 500, 'INTERNAL_ERROR');
  }
}
