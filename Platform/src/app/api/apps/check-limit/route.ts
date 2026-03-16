import { auth, canCreateApp } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const result = await canCreateApp(session.user.id);
    return apiSuccess(result);
  } catch (error) {
    logger.error('apps.checkLimit', 'Failed to check limit', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to check limit', 500, 'INTERNAL_ERROR');
  }
}
