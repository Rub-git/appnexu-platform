# Queue Architecture — Generation Pipeline

## Overview

The app generation and publishing pipeline uses a queue-based architecture to handle heavy work asynchronously, preventing request timeouts and enabling scalability.

```
User clicks "Publish"
        ↓
POST /api/apps/[id]/publish
        ↓
  Validate ownership & pre-reqs
        ↓
  Set status → QUEUED
        ↓
  Enqueue job (QStash or inline)
        ↓
  Return immediately (202-like)
        ↓
POST /api/jobs/generate (background)
        ↓
  Set status → GENERATING
        ↓
  Analyze target website
        ↓
  Validate manifest & SW
        ↓
  Update metadata if improved
        ↓
  Set status → PUBLISHED  ✓
        (or)
  Set status → FAILED  ✗ (with reason)
```

## Stack

### Production: Upstash QStash
- **HTTP-based** — delivers jobs by calling your API endpoint
- **No persistent connections** — perfect for Vercel serverless
- **Built-in retry** — configurable retry with backoff
- **Deduplication** — prevents double-queueing within a time window
- **Free tier** — 500 messages/day

### Development: Inline Fallback
- When `QSTASH_TOKEN` is not set, jobs run inline via `fetch()`
- Fire-and-forget: the publish endpoint returns immediately
- Uses `x-job-secret` header for authentication
- No external dependencies needed

## Environment Variables

### Production (Required)
```env
QSTASH_TOKEN=qst_...                    # QStash API token
QSTASH_CURRENT_SIGNING_KEY=sig_...       # For verifying incoming jobs
QSTASH_NEXT_SIGNING_KEY=sig_...          # Rotated signing key
```

### Development (Optional)
```env
JOB_SECRET=dev-job-secret                # Shared secret for inline jobs
```

If neither QStash nor JOB_SECRET is configured, the inline fallback uses `dev-job-secret` as the default.

## Setup

### Upstash QStash (Production)

1. Create an account at [upstash.com](https://upstash.com)
2. Create a QStash instance
3. Copy `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
4. Add them to your Vercel environment variables
5. QStash will POST to `https://YOUR_DOMAIN/api/jobs/generate`

### Local Development

No setup needed. Jobs run inline automatically when QStash env vars are missing.

To test with QStash locally, you can use the [QStash local tunnel](https://docs.upstash.com/qstash/quickstarts/local-tunnel).

## Status Model

| Status | Description |
|--------|-------------|
| `DRAFT` | App created, not published |
| `QUEUED` | Publish requested, waiting for worker |
| `GENERATING` | Worker is actively processing |
| `PUBLISHED` | Generation complete, publicly accessible |
| `FAILED` | Generation failed (with reason stored) |
| `STAGED` | Reserved for future staged deployments |

## Database Fields

```prisma
model AppProject {
  status          AppStatus  // DRAFT | QUEUED | GENERATING | PUBLISHED | FAILED
  failureReason   String?    // Human-readable failure message
  lastJobId       String?    // QStash message ID for tracking
  lastGeneratedAt DateTime?  // Last successful generation timestamp
  retryCount      Int        // Number of retries attempted
}
```

## Retry Logic

- **Automatic retry**: Up to 3 attempts (configurable via `MAX_RETRIES`)
- **Manual retry**: Users can click "Retry" on failed apps
- **Deduplication**: Each retry gets a unique deduplication ID
- **Safe limits**: Manual retry is blocked after `MAX_RETRIES` exceeded

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apps/[id]/publish` | POST | Queue a publish job |
| `/api/apps/[id]/publish` | DELETE | Unpublish/cancel |
| `/api/apps/[id]/retry` | POST | Manually retry failed job |
| `/api/apps/[id]/status` | GET | Poll current generation status |
| `/api/jobs/generate` | POST | Job handler (called by queue) |

## Idempotency

The job handler is designed to be idempotent:
- If the app is already `PUBLISHED`, the job is a no-op
- If the app is in an unexpected state, the job is skipped
- Database updates use atomic operations
- The status check before processing prevents stale jobs from corrupting state

## Security

- **QStash (production)**: Signature verification using `@upstash/qstash` Receiver
- **Inline (dev)**: Shared secret in `x-job-secret` header
- **Ownership**: Job handler verifies `userId` matches app owner
- **No public access**: The `/api/jobs/generate` endpoint rejects unsigned requests

## Monitoring

All queue operations are logged via the structured logger:
```
[INFO] [queue] Job enqueued via QStash {"jobId":"msg_...","appId":"..."}
[INFO] [jobs.generate] Job started {"appId":"...","attempt":0}
[INFO] [jobs.generate] App published successfully {"appId":"...","slug":"..."}
[WARN] [jobs.generate] App marked as FAILED {"appId":"...","reason":"..."}
```

## Dashboard Integration

The `PublishButton` component:
1. Shows real-time status (Queued → Generating → Published/Failed)
2. Polls `/api/apps/[id]/status` every 2 seconds while processing
3. Displays failure reason and retry button for failed apps
4. Prevents double-publish with server-side status checks
