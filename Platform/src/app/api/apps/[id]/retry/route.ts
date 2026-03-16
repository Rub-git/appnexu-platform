import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { enqueueGenerateJob, MAX_RETRIES } from "@/lib/queue";

/**
 * POST /api/apps/[id]/retry
 *
 * Manually retry a FAILED generation job.
 * Only allowed for apps in FAILED status owned by the current user.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    if (!id || typeof id !== "string") {
      return apiError("Invalid app ID", 400, "INVALID_ID");
    }

    const app = await prisma.appProject.findUnique({ where: { id } });

    if (!app) {
      return apiError("App not found", 404, "NOT_FOUND");
    }

    if (app.userId !== session.user.id) {
      return apiError("Forbidden", 403, "FORBIDDEN");
    }

    // Only FAILED apps can be retried
    if (app.status !== "FAILED") {
      return apiError(
        `Cannot retry: app is in ${app.status} status`,
        400,
        "INVALID_STATUS"
      );
    }

    // Check retry limit
    if (app.retryCount >= MAX_RETRIES) {
      return apiError(
        "Maximum retry limit reached. Please edit the app and try publishing again.",
        400,
        "MAX_RETRIES_EXCEEDED"
      );
    }

    // Set to QUEUED
    await prisma.appProject.update({
      where: { id },
      data: {
        status: "QUEUED",
        failureReason: null,
      },
    });

    // Enqueue retry job
    const nextAttempt = app.retryCount + 1;
    const deduplicationId = `retry-${id}-${nextAttempt}-${Date.now()}`;

    const result = await enqueueGenerateJob(
      { appId: id, userId: session.user.id, attempt: nextAttempt },
      deduplicationId
    );

    // Update job ID
    await prisma.appProject.update({
      where: { id },
      data: { lastJobId: result.jobId },
    });

    logger.info("retry", "Retry job queued", {
      userId: session.user.id,
      appId: id,
      attempt: nextAttempt,
      jobId: result.jobId,
    });

    return apiSuccess({
      id: app.id,
      status: "QUEUED",
      jobId: result.jobId,
      attempt: nextAttempt,
    });
  } catch (error) {
    logger.error("retry", "Retry failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return apiError("Failed to retry generation", 500, "INTERNAL_ERROR");
  }
}
