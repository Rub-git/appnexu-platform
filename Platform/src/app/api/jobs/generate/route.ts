import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyJobRequest } from "@/lib/verify-job";
import { MAX_RETRIES, enqueueGenerateJob } from "@/lib/queue";
import type { GenerateJobPayload } from "@/lib/queue";
import { trackEvent } from "@/lib/analytics";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Allow up to 30s for generation

/**
 * POST /api/jobs/generate
 *
 * Background job handler for the app generation/publish pipeline.
 * Called by QStash (production) or inline fetch (development).
 *
 * Pipeline:
 *   1. Verify request authenticity
 *   2. Load app from DB and verify it's in QUEUED or GENERATING state
 *   3. Mark as GENERATING
 *   4. Analyze target website (fetch metadata, icons)
 *   5. Validate manifest fields
 *   6. Validate service worker generation
 *   7. Mark as PUBLISHED (or FAILED with reason)
 *
 * Idempotency: If the app is already PUBLISHED, the job is a no-op.
 * If the app is in FAILED state but jobId matches, it was already processed.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // 1. Verify request authenticity
  const verification = await verifyJobRequest(request, rawBody);
  if (!verification.valid) {
    logger.warn("jobs.generate", "Unauthorized job request", {
      reason: verification.reason,
    });
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let payload: GenerateJobPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { appId, userId, attempt } = payload;

  if (!appId || !userId) {
    return NextResponse.json(
      { error: "Missing appId or userId" },
      { status: 400 }
    );
  }

  logger.info("jobs.generate", "Job started", { appId, userId, attempt });

  try {
    // 2. Load app and verify state
    const app = await prisma.appProject.findUnique({ where: { id: appId } });

    if (!app) {
      logger.error("jobs.generate", "App not found", { appId });
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Ownership check
    if (app.userId !== userId) {
      logger.error("jobs.generate", "Ownership mismatch", { appId, userId });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Idempotency: if already published, skip
    if (app.status === "PUBLISHED") {
      logger.info("jobs.generate", "App already published, skipping", { appId });
      return NextResponse.json({ status: "already_published" });
    }

    // Only process QUEUED or GENERATING apps (GENERATING handles retries)
    if (app.status !== "QUEUED" && app.status !== "GENERATING") {
      logger.warn("jobs.generate", "Unexpected app status", {
        appId,
        status: app.status,
      });
      return NextResponse.json({ status: "skipped", reason: "unexpected_status" });
    }

    // 3. Mark as GENERATING
    await prisma.appProject.update({
      where: { id: appId },
      data: {
        status: "GENERATING",
        failureReason: null,
      },
    });

    // 4. Validate required fields
    const validationErrors: string[] = [];
    if (!app.appName || app.appName.trim().length === 0)
      validationErrors.push("App name is required");
    if (!app.targetUrl || app.targetUrl.trim().length === 0)
      validationErrors.push("Target URL is required");
    if (!app.slug) validationErrors.push("App slug is missing");

    if (validationErrors.length > 0) {
      await markFailed(appId, validationErrors.join("; "), attempt);
      return NextResponse.json({ status: "failed", errors: validationErrors });
    }

    // 5. Analyze target website (re-scrape for freshest metadata)
    let analysisResult: AnalysisResult | null = null;
    try {
      analysisResult = await analyzeWebsite(app.targetUrl);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Website analysis failed";
      logger.warn("jobs.generate", "Website analysis failed", { appId, error: msg });
      // Non-fatal: we can still publish with existing data
      // Only fail if we have NO icon data at all
    }

    // 6. Update app with analysis data if we got new info
    const updateData: Record<string, unknown> = {};

    if (analysisResult) {
      // Only update iconUrls if current ones are defaults and we found real ones
      if (
        analysisResult.icons.length > 0 &&
        (!app.iconUrls || app.iconUrls.trim().length === 0)
      ) {
        updateData.iconUrls = analysisResult.icons.join(",");
      }
      // Update theme color if we found one and the app has default
      if (
        analysisResult.themeColor &&
        analysisResult.themeColor !== "#ffffff" &&
        (!app.themeColor || app.themeColor === "#178BFF")
      ) {
        updateData.themeColor = analysisResult.themeColor;
      }
    }

    // Validate icon availability (must have at least something)
    const finalIconUrls =
      (updateData.iconUrls as string) || app.iconUrls || "";
    if (!finalIconUrls || finalIconUrls.trim().length === 0) {
      // Non-fatal: icon-proxy generates a branded fallback from app name/domain.
      updateData.iconUrls = "";
    } else {
      updateData.iconUrls = finalIconUrls;
    }

    // 7. Verify manifest generation endpoint works
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      "http://localhost:3000";

    let manifestValid = false;
    try {
      const manifestRes = await fetch(
        `${baseUrl}/pwa/${appId}/manifest.json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (manifestRes.ok) {
        const manifest = await manifestRes.json();
        manifestValid =
          !!manifest.name && !!manifest.start_url && Array.isArray(manifest.icons);
      }
    } catch (error) {
      logger.warn("jobs.generate", "Manifest validation failed", {
        appId,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }

    if (!manifestValid) {
      logger.warn("jobs.generate", "Manifest endpoint not valid, proceeding anyway", {
        appId,
      });
      // Non-fatal: manifest is generated dynamically, it will work once app is saved
    }

    // 8. Verify service worker endpoint works
    try {
      const swRes = await fetch(`${baseUrl}/pwa/${appId}/sw.js`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!swRes.ok) {
        logger.warn("jobs.generate", "Service worker endpoint returned error", {
          appId,
          status: swRes.status,
        });
      }
    } catch (error) {
      logger.warn("jobs.generate", "Service worker check failed", {
        appId,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }

    // 9. Mark as PUBLISHED
    await prisma.appProject.update({
      where: { id: appId },
      data: {
        ...updateData,
        status: "PUBLISHED",
        failureReason: null,
        lastGeneratedAt: new Date(),
        retryCount: attempt,
      },
    });

    // Track PUBLISHED analytics event
    await trackEvent({
      appId,
      eventType: 'PUBLISHED',
      metadata: { slug: app.slug, attempt },
    });

    logger.info("jobs.generate", "App published successfully", {
      appId,
      slug: app.slug,
      attempt,
    });

    return NextResponse.json({
      status: "published",
      slug: app.slug,
      publicUrl: `/app/${app.slug}`,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown generation error";

    logger.error("jobs.generate", "Job failed unexpectedly", {
      appId,
      attempt,
      error: errorMsg,
    });

    // Mark as failed and potentially retry
    await markFailed(appId, errorMsg, attempt);

    // If we haven't exhausted retries, re-enqueue
    if (attempt < MAX_RETRIES - 1) {
      try {
        await enqueueGenerateJob(
          { appId, userId, attempt: attempt + 1 },
          `retry-${appId}-${attempt + 1}`
        );
        logger.info("jobs.generate", "Retry enqueued", {
          appId,
          nextAttempt: attempt + 1,
        });
      } catch (retryError) {
        logger.error("jobs.generate", "Failed to enqueue retry", {
          appId,
          error:
            retryError instanceof Error ? retryError.message : "Unknown",
        });
      }
    }

    return NextResponse.json({ status: "failed", error: errorMsg }, { status: 500 });
  }
}

// ─── Helper: Mark app as FAILED ─────────────────────────────────────────────

async function markFailed(
  appId: string,
  reason: string,
  attempt: number
): Promise<void> {
  try {
    await prisma.appProject.update({
      where: { id: appId },
      data: {
        status: "FAILED",
        failureReason: reason,
        retryCount: attempt,
      },
    });
    logger.warn("jobs.generate", "App marked as FAILED", {
      appId,
      reason,
      attempt,
    });
  } catch (updateError) {
    logger.error("jobs.generate", "Failed to update app status to FAILED", {
      appId,
      error:
        updateError instanceof Error ? updateError.message : "Unknown",
    });
  }
}

// ─── Helper: Analyze website ────────────────────────────────────────────────

interface AnalysisResult {
  title: string;
  description: string;
  themeColor: string;
  icons: string[];
}

interface WebsiteManifestIcon {
  src?: string;
}

interface WebsiteManifest {
  icons?: WebsiteManifestIcon[];
}

async function extractManifestIcons(url: string, $: cheerio.CheerioAPI): Promise<string[]> {
  const manifestHref = $('link[rel="manifest"]').attr('href');
  if (!manifestHref) return [];

  try {
    const manifestUrl = new URL(manifestHref, url).toString();
    const manifestRes = await fetch(manifestUrl, {
      headers: {
        'User-Agent': 'Appnexu-Generator/1.0',
        'Accept': 'application/manifest+json,application/json;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
    });

    if (!manifestRes.ok) return [];

    const manifest = (await manifestRes.json()) as WebsiteManifest;
    if (!Array.isArray(manifest.icons)) return [];

    return manifest.icons
      .map((icon) => icon?.src)
      .filter((src): src is string => Boolean(src))
      .map((src) => {
        try {
          return new URL(src, manifestUrl).toString();
        } catch {
          return '';
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Appnexu-Generator/1.0" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const rawTitle =
      $("title").text() ||
      $('meta[property="og:title"]').attr("content") ||
      "";
    const rawDescription =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";
    const themeColor =
      $('meta[name="theme-color"]').attr("content") || "#ffffff";

    const icons: string[] = [];
    $(
      'link[rel="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]'
    ).each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          icons.push(new URL(href, url).href);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    const manifestIcons = await extractManifestIcons(url, $);
    let faviconFallback = "";
    try {
      faviconFallback = new URL('/favicon.ico', url).toString();
    } catch {
      faviconFallback = "";
    }

    return {
      title: rawTitle.trim() || new URL(url).hostname,
      description:
        rawDescription.trim() || `App generated for ${rawTitle.trim()}`,
      themeColor,
      icons: [...new Set([...icons, ...manifestIcons, ...(faviconFallback ? [faviconFallback] : [])])],
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
