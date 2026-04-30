import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// DELETE /api/admin/apps/[id]/domain - Admin can release a reserved custom domain
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
      select: { id: true, appName: true, customDomain: true },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    await prisma.appProject.update({
      where: { id },
      data: { customDomain: null },
    });

    logger.info('admin.domain', 'Admin released custom domain', {
      adminId: admin.id,
      appId: id,
      appName: app.appName,
      domain: app.customDomain,
    });

    return apiSuccess({
      id,
      appName: app.appName,
      releasedDomain: app.customDomain,
    });
  } catch (error) {
    logger.error('admin.domain', 'Failed to release custom domain', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to release custom domain', 500, 'INTERNAL_ERROR');
  }
}
