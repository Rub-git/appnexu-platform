import "server-only";

/**
 * Verify that a job request is legitimate.
 *
 * Production (QStash): verifies the Upstash signature using signing keys.
 * Development (inline): verifies the shared JOB_SECRET header.
 */

import { Receiver } from "@upstash/qstash";
import { logger } from "./logger";
import { isQStashConfigured } from "./queue";

let _receiver: Receiver | null = null;

function getReceiver(): Receiver | null {
  if (_receiver) return _receiver;

  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey || !nextKey) return null;

  _receiver = new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });

  return _receiver;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify a job request.
 *
 * @param request  The incoming Request object
 * @param rawBody  The raw body string (needed for QStash signature verification)
 */
export async function verifyJobRequest(
  request: Request,
  rawBody: string
): Promise<VerifyResult> {
  // If QStash is configured, verify the signature
  if (isQStashConfigured()) {
    const receiver = getReceiver();
    if (!receiver) {
      logger.error("verify-job", "QStash signing keys not configured");
      return { valid: false, reason: "Signing keys not configured" };
    }

    const signature = request.headers.get("upstash-signature");
    if (!signature) {
      return { valid: false, reason: "Missing upstash-signature header" };
    }

    try {
      await receiver.verify({
        signature,
        body: rawBody,
      });
      return { valid: true };
    } catch (error) {
      logger.warn("verify-job", "QStash signature verification failed", {
        error: error instanceof Error ? error.message : "Unknown",
      });
      return { valid: false, reason: "Invalid signature" };
    }
  }

  // Development mode: verify shared secret
  const jobSecret = request.headers.get("x-job-secret");
  const expectedSecret = process.env.JOB_SECRET || "dev-job-secret";

  if (jobSecret !== expectedSecret) {
    return { valid: false, reason: "Invalid job secret" };
  }

  return { valid: true };
}
