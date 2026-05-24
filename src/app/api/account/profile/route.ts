import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { updateProfileSchema, formatZodErrors } from '@/lib/validations';
import { logger } from '@/lib/logger';

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
    }

    const nextName = parsed.data.name?.trim();
    if (!nextName) {
      return apiError('Name is required', 400, 'NAME_REQUIRED');
    }

    if (!session?.user?.id) return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: nextName },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
      },
    });

    logger.info('account.profile', 'User profile updated', {
      userId: updated.id,
    });

    return apiSuccess({ user: updated });
  } catch (error) {
    logger.error('account.profile', 'Failed to update user profile', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to update profile', 500, 'INTERNAL_ERROR');
  }
}
