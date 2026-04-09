import { auth, canCreateApp } from '@/lib/auth';
import { withRetry } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Use retry wrapper for transient Supabase connection issues
    const result = await withRetry(() => canCreateApp(session.user!.id));
    return apiSuccess(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown';
    logger.error('apps.checkLimit', 'Failed to check limit', { error: message });

    // Provide more descriptive error based on error type
    if (message.includes("Can't reach database") || message.includes('connect') || message.includes('ECONNREFUSED')) {
      return apiError(
        'No se pudo conectar a la base de datos. Por favor, inténtalo de nuevo en unos momentos.',
        503,
        'DATABASE_UNAVAILABLE'
      );
    }

    if (message.includes('prisma') || message.includes('Prisma')) {
      return apiError(
        'Error de base de datos. Por favor, inténtalo de nuevo.',
        500,
        'DATABASE_ERROR'
      );
    }

    return apiError('Error al verificar el límite de apps. Por favor, inténtalo de nuevo.', 500, 'INTERNAL_ERROR');
  }
}
