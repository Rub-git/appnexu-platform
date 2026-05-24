import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

/**
 * Admin endpoint to update a user's plan.
 * 
 * PATCH /api/admin/user-plan
 * Body: { email: string, plan: "FREE" | "PRO" | "AGENCY" }
 */
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Unauthorized - Admin required', 403, 'FORBIDDEN');
    }

    let body: { email?: string; plan?: string };
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON', 400, 'INVALID_JSON');
    }

    const { email, plan } = body;

    if (!email || !plan) {
      return apiError('Email and plan are required', 400, 'MISSING_PARAMS');
    }

    if (!['FREE', 'PRO', 'AGENCY'].includes(plan)) {
      return apiError('Invalid plan. Must be FREE, PRO, or AGENCY', 400, 'INVALID_PLAN');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return apiError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { plan: plan as 'FREE' | 'PRO' | 'AGENCY' },
      select: { id: true, email: true, name: true, plan: true, role: true },
    });

    logger.info('admin.userPlan', 'Plan updated', {
      adminId: admin.id,
      targetEmail: email,
      oldPlan: user.plan,
      newPlan: plan,
    });

    return apiSuccess({
      user: updated,
      message: `Plan actualizado de ${user.plan} a ${plan} para ${email}`,
    });
  } catch (error) {
    logger.error('admin.userPlan', 'Failed to update plan', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Internal error', 500, 'INTERNAL_ERROR');
  }
}
