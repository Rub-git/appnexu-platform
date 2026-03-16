import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { enqueueGenerateJob } from "@/lib/queue";

/**
 * POST /api/apps/[id]/publish
 *
 * Queues a generation/publish job instead of publishing inline.
 * The actual work is done by /api/jobs/generate.
 *
 * Flow:
 *   1. Validate ownership and pre-requisites
 *   2. Set status to QUEUED
 *   3. Enqueue job via QStash (production) or inline (dev)
 *   4. Return immediately with job ID
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

    // Verify ownership
    const app = await prisma.appProject.findUnique({ where: { id } });

    if (!app) {
      return apiError("App not found", 404, "NOT_FOUND");
    }

    if (app.userId !== session.user.id) {
      return apiError("Forbidden", 403, "FORBIDDEN");
    }

    // Prevent double-queueing: only DRAFT or FAILED apps can be published
    if (app.status === "PUBLISHED") {
      return apiError("App is already published", 400, "ALREADY_PUBLISHED");
    }
    if (app.status === "QUEUED" || app.status === "GENERATING") {
      return apiError(
        "App is already being processed. Please wait.",
        409,
        "ALREADY_PROCESSING"
      );
    }

    // Pre-flight validation (fast checks before queueing)
    const errors: string[] = [];
    if (!app.appName || app.appName.trim().length === 0)
      errors.push("App name is required");
    if (!app.targetUrl || app.targetUrl.trim().length === 0)
      errors.push("Target URL is required");
    if (!app.slug) errors.push("App slug is missing");

    if (errors.length > 0) {
      return apiError("Validation failed", 400, "VALIDATION_ERROR", errors);
    }

    // Set status to QUEUED
    await prisma.appProject.update({
      where: { id },
      data: {
        status: "QUEUED",
        failureReason: null,
        retryCount: 0,
      },
    });

    // Enqueue the generation job
    const deduplicationId = `publish-${id}-${Date.now()}`;
    const result = await enqueueGenerateJob(
      { appId: id, userId: session.user.id, attempt: 0 },
      deduplicationId
    );

    // Store the job ID for tracking
    await prisma.appProject.update({
      where: { id },
      data: { lastJobId: result.jobId },
    });

    logger.info("publish", "Publish job queued", {
      userId: session.user.id,
      appId: id,
      jobId: result.jobId,
      mode: result.mode,
    });

    return apiSuccess({
      id: app.id,
      slug: app.slug,
      status: "QUEUED",
      jobId: result.jobId,
      mode: result.mode,
    });
  } catch (error) {
    logger.error("publish", "Publish failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });

    // Try to revert to DRAFT on failure
    try {
      const { id } = await params;
      const currentApp = await prisma.appProject.findUnique({ where: { id } });
      if (currentApp && currentApp.status === "QUEUED") {
        await prisma.appProject.update({
          where: { id },
          data: { status: "DRAFT" },
        });
      }
    } catch {
      // Ignore revert errors
    }

    return apiError("Failed to queue publish job", 500, "INTERNAL_ERROR");
  }
}

/**
 * DELETE /api/apps/[id]/publish
 *
 * Unpublish an app (revert to DRAFT).
 * Also cancels if QUEUED.
 */
export async function DELETE(
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

    if (app.status === "DRAFT") {
      return apiError("App is already a draft", 400, "ALREADY_DRAFT");
    }

    // Revert to DRAFT from any state
    const updatedApp = await prisma.appProject.update({
      where: { id },
      data: {
        status: "DRAFT",
        failureReason: null,
        lastJobId: null,
      },
    });

    logger.info("publish", "App unpublished/cancelled", {
      userId: session.user.id,
      appId: id,
      previousStatus: app.status,
    });

    return apiSuccess({
      id: updatedApp.id,
      status: updatedApp.status,
    });
  } catch (error) {
    logger.error("publish", "Unpublish failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return apiError("Failed to unpublish app", 500, "INTERNAL_ERROR");
  }
}
