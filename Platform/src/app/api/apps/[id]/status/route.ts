import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-utils";

/**
 * GET /api/apps/[id]/status
 *
 * Lightweight endpoint for polling app generation status.
 * Used by the dashboard to update UI in real-time.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id } = await params;

    const app = await prisma.appProject.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        slug: true,
        failureReason: true,
        lastJobId: true,
        lastGeneratedAt: true,
        retryCount: true,
        userId: true,
      },
    });

    if (!app) {
      return apiError("App not found", 404, "NOT_FOUND");
    }

    if (app.userId !== session.user.id) {
      return apiError("Forbidden", 403, "FORBIDDEN");
    }

    return apiSuccess({
      id: app.id,
      status: app.status,
      slug: app.slug,
      failureReason: app.failureReason,
      lastJobId: app.lastJobId,
      lastGeneratedAt: app.lastGeneratedAt,
      retryCount: app.retryCount,
    });
  } catch {
    return apiError("Failed to fetch status", 500, "INTERNAL_ERROR");
  }
}
