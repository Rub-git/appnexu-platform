/**
 * POST /api/admin/apps/[id]/retry
 * 
 * Admin action to retry a failed generation job.
 * Requires ADMIN role.
 */
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { enqueueGenerateJob } from '@/lib/queue';
import { logger } from '@/lib/logger';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const { id } = await params;

    const app = await prisma.appProject.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true, slug: true, retryCount: true },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (app.status !== 'FAILED') {
      return apiError('Only failed apps can be retried', 400, 'INVALID_STATUS');
    }

    // Reset status to QUEUED
    await prisma.appProject.update({
      where: { id },
      data: {
        status: 'QUEUED',
        failureReason: null,
      },
    });

    // Enqueue generation job
    const deduplicationId = `admin-retry-${id}-${Date.now()}`;
    const result = await enqueueGenerateJob(
      { appId: id, userId: app.userId, attempt: app.retryCount },
      deduplicationId
    );

    // Store job ID
    await prisma.appProject.update({
      where: { id },
      data: { lastJobId: result.jobId },
    });

    logger.info('admin', 'Admin retried failed job', {
      adminId: admin.id,
      appId: id,
      jobId: result.jobId,
    });

    return apiSuccess({ id, status: 'QUEUED', jobId: result.jobId });
  } catch (error) {
    return apiError('Failed to retry job', 500, 'INTERNAL_ERROR');
  }
}
