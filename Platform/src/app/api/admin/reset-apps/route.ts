import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

/**
 * Admin endpoint to check and reset app count for a user.
 * 
 * GET /api/admin/reset-apps?email=user@example.com
 *   → Returns user info and app count
 * 
 * DELETE /api/admin/reset-apps?email=user@example.com
 *   → Deletes all apps for that user, resetting the counter
 */

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Unauthorized - Admin required', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return apiError('Email parameter required', 400, 'MISSING_EMAIL');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        _count: { select: { apps: true } },
        apps: {
          select: {
            id: true,
            appName: true,
            targetUrl: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return apiError('User not found', 404, 'USER_NOT_FOUND');
    }

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
        appCount: user._count.apps,
      },
      apps: user.apps,
    });
  } catch (error) {
    logger.error('admin.resetApps', 'Failed to fetch user info', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Internal error', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Unauthorized - Admin required', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return apiError('Email parameter required', 400, 'MISSING_EMAIL');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, _count: { select: { apps: true } } },
    });

    if (!user) {
      return apiError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Delete all apps for this user
    const deleteResult = await prisma.appProject.deleteMany({
      where: { userId: user.id },
    });

    logger.info('admin.resetApps', 'Apps reset for user', {
      adminId: admin.id,
      targetEmail: email,
      deletedCount: deleteResult.count,
    });

    return apiSuccess({
      deletedCount: deleteResult.count,
      message: `Se eliminaron ${deleteResult.count} app(s) del usuario ${email}. El contador ha sido reseteado.`,
    });
  } catch (error) {
    logger.error('admin.resetApps', 'Failed to reset apps', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Internal error', 500, 'INTERNAL_ERROR');
  }
}
