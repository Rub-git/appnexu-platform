/**
 * GET /api/apps/[id]/suggestions
 * Get AI suggestions for an app.
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
        aiAnalysisStatus: true,
        aiSuggestedName: true,
        aiSuggestedNavigation: true,
        aiSuggestedColors: true,
        aiSuggestedActions: true,
      },
    });

    if (!app) return apiError('App not found', 404, 'NOT_FOUND');
    if (app.userId !== session.user.id) return apiError('Forbidden', 403, 'FORBIDDEN');

    return apiSuccess({
      status: app.aiAnalysisStatus,
      suggestions: {
        name: app.aiSuggestedName,
        navigation: app.aiSuggestedNavigation,
        colors: app.aiSuggestedColors,
        actions: app.aiSuggestedActions,
      },
    });
  } catch (error) {
    return apiError('Failed to fetch suggestions', 500, 'INTERNAL_ERROR');
  }
}
