/**
 * GET /api/apps/[id]/analytics/chart
 *
 * Returns time-series chart data for an app.
 * Requires authentication and app ownership verification.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getChartData } from '@/lib/analytics';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;

    // Verify ownership
    const app = await prisma.appProject.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (app.userId !== session.user.id) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    // Get period from query params
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || '30d') as '7d' | '30d' | 'all';

    if (!['7d', '30d', 'all'].includes(period)) {
      return apiError('Invalid period. Use 7d, 30d, or all', 400, 'INVALID_PERIOD');
    }

    const chartData = await getChartData(id, period);

    return apiSuccess(chartData);
  } catch (error) {
    return apiError('Failed to fetch chart data', 500, 'INTERNAL_ERROR');
  }
}
