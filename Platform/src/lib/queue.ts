import "server-only";

/**
 * Queue abstraction layer.
 *
 * Production: Upstash QStash (HTTP-based, serverless-native)
 *   - Delivers jobs as HTTP POST to /api/jobs/generate
 *   - Built-in retry, deduplication, delay
 *   - Requires QSTASH_TOKEN + QSTASH_CURRENT_SIGNING_KEY + QSTASH_NEXT_SIGNING_KEY
 *
 * Development fallback: Inline async execution
 *   - Calls the job handler directly via internal fetch
 *   - No external dependencies needed for local dev
 */

import { Client } from "@upstash/qstash";
import { logger } from "./logger";

function isUsableBaseUrl(value: string | undefined): value is string {
  if (!value) return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return !["your-domain.com", "example.com", "www.example.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function resolveAppBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
  ];

  const resolved = candidates.find(isUsableBaseUrl);
  return resolved ?? "http://localhost:3000";
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenerateJobPayload {
  appId: string;
  userId: string;
  /** Retry attempt number (0-based) */
  attempt: number;
}

export interface QueueResult {
  /** Job/message ID for tracking */
  jobId: string;
  /** Whether the job was queued via QStash or run inline */
  mode: "qstash" | "inline";
}

// ─── QStash client (lazy singleton) ──────────────────────────────────────────

let _qstashClient: Client | null = null;

function getQStashClient(): Client | null {
  if (_qstashClient) return _qstashClient;

  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;

  _qstashClient = new Client({ token });
  return _qstashClient;
}

/** Check whether QStash is available */
export function isQStashConfigured(): boolean {
  return !!process.env.QSTASH_TOKEN;
}

// ─── Max retry configuration ────────────────────────────────────────────────

export const MAX_RETRIES = 3;

// ─── Enqueue ─────────────────────────────────────────────────────────────────

/**
 * Enqueue a generation job.
 *
 * - In production (QStash configured): publishes to QStash which delivers
 *   an HTTP POST to /api/jobs/generate.
 * - In development (no QStash): fires an async fetch to localhost.
 *
 * @param payload  Job payload
 * @param deduplicationId  Optional dedup key to prevent double-queueing
 */
export async function enqueueGenerateJob(
  payload: GenerateJobPayload,
  deduplicationId?: string
): Promise<QueueResult> {
  const client = getQStashClient();

  if (client) {
    return enqueueViaQStash(client, payload, deduplicationId);
  }

  return enqueueInline(payload);
}

// ─── QStash implementation ──────────────────────────────────────────────────

async function enqueueViaQStash(
  client: Client,
  payload: GenerateJobPayload,
  deduplicationId?: string
): Promise<QueueResult> {
  const baseUrl = resolveAppBaseUrl();

  const destination = `${baseUrl}/api/jobs/generate`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Deduplication prevents the same job from being enqueued multiple times
  // within a 10-minute window
  if (deduplicationId) {
    headers["Upstash-Deduplication-Id"] = deduplicationId;
  }

  try {
    const response = await client.publishJSON({
      url: destination,
      body: payload,
      retries: MAX_RETRIES,
      headers,
    });

    const messageId =
      "messageId" in response ? response.messageId : `qstash-${Date.now()}`;

    logger.info("queue", "Job enqueued via QStash", {
      jobId: messageId,
      appId: payload.appId,
      attempt: payload.attempt,
    });

    return { jobId: messageId, mode: "qstash" };
  } catch (error) {
    logger.error("queue", "QStash enqueue failed", {
      appId: payload.appId,
      error: error instanceof Error ? error.message : "Unknown",
    });
    throw error;
  }
}

// ─── Inline fallback (development) ──────────────────────────────────────────

async function enqueueInline(
  payload: GenerateJobPayload
): Promise<QueueResult> {
  const jobId = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  logger.info("queue", "Job enqueued inline (dev mode)", {
    jobId,
    appId: payload.appId,
    attempt: payload.attempt,
  });

  // Fire-and-forget: call the job handler asynchronously
  // This runs in the same process but doesn't block the publish response
  const baseUrl = resolveAppBaseUrl();

  // Use setTimeout to ensure we return before the job starts
  setTimeout(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/jobs/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Inline jobs use a shared secret for auth instead of QStash signatures
          "x-job-secret": process.env.JOB_SECRET || "dev-job-secret",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        logger.error("queue", "Inline job handler returned error", {
          jobId,
          status: response.status,
          body: text.slice(0, 500),
        });
      }
    } catch (error) {
      logger.error("queue", "Inline job handler failed", {
        jobId,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }, 50);

  return { jobId, mode: "inline" };
}
