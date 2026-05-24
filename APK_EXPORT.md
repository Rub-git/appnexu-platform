# APK Export System

## Overview

Generates a Capacitor-based Android project structure that wraps a published PWA in a native WebView. Users download a zip containing the project files and build instructions.

## ⚠️ Production Architecture WARNING

**The current implementation generates a Capacitor project zip, NOT a compiled APK.**

Building an actual APK requires:
- Android SDK (1+ GB)
- Gradle build (2-5 minutes)
- Java 17 runtime

**This CANNOT run inside Vercel serverless functions:**
- Hobby plan: 10s timeout
- Pro plan: 60s timeout (still insufficient)
- No Android SDK available

### Recommended Production Architecture

```
┌──────────────┐   POST /api/apps/[id]/export-apk   ┌──────────────┐
│   Client      │ ──────────────────────────────────▶ │  API Route    │
└──────────────┘                                      │  (validate +  │
                                                      │  enqueue job) │
                                                      └──────┬───────┘
                                                             │
                                                      ┌──────▼───────┐
                                                      │  Job Queue    │
                                                      │  (QStash/SQS) │
                                                      └──────┬───────┘
                                                             │
                                                      ┌──────▼───────┐
                                                      │  Build Worker  │
                                                      │  (EC2/GH       │
                                                      │  Actions/Cloud │
                                                      │  Build)        │
                                                      └──────┬───────┘
                                                             │
                                                      ┌──────▼───────┐
                                                      │  Blob Storage  │
                                                      │  (Vercel Blob/ │
                                                      │  S3)           │
                                                      └──────┬───────┘
                                                             │
                                                      ┌──────▼───────┐
                                                      │  PATCH status  │
                                                      │  → READY +     │
                                                      │  downloadUrl   │
                                                      └──────────────┘
```

**Options for the build worker:**
1. **GitHub Actions** — Trigger a workflow with Android SDK installed.
2. **AWS CodeBuild** — On-demand container with Android toolchain.
3. **Dedicated EC2** — Always-on or spot instance with caching.
4. **Bitrise / Codemagic** — Mobile CI/CD specialized services.

## Current Implementation

The current implementation:
1. Generates `capacitor.config.json`, `package.json`, `www/index.html`, `AndroidManifest.xml`, `BUILD_INSTRUCTIONS.md`
2. Archives them into a `.zip`
3. Stores in `/tmp` (ephemeral on serverless)
4. Returns download URL pointing to `/api/apps/[id]/download-apk`

This is suitable for **MVP / demo** but NOT for production APK compilation.

## Environment Variables

No additional variables needed for the current zip-generation approach.

For production APK builds:
| Variable | Description |
|----------|-------------|
| `APK_BUILD_QUEUE_URL` | Job queue endpoint (QStash/SQS) |
| `BLOB_STORAGE_TOKEN` | Vercel Blob or S3 token for APK uploads |

## Security & Limits

| Feature | Value |
|---------|-------|
| Auth | Required + ownership check |
| Plan gate | PRO / AGENCY only |
| Rate limit | 5 builds/day/user |
| Status locking | BUILDING status prevents double-build |
| Build timeout | 30s for tar (current), N/A for real builds |
| Cleanup | /tmp build dir cleaned on failure |

## API Endpoints

### `POST /api/apps/[id]/export-apk`
- **Auth**: Required + ownership.
- **Plan gate**: PRO / AGENCY only.
- **Pre-condition**: App must be PUBLISHED.
- **Idempotent**: Rejects if BUILDING.
- **Rate limit**: 5/day/user.

### `GET /api/apps/[id]/apk-status`
- **Auth**: Required + ownership.
- **Returns**: `{ status, downloadUrl, lastBuiltAt }`

### `GET /api/apps/[id]/download-apk`
- **Auth**: Required + ownership.
- **Serves**: Zip file from /tmp or redirects to Blob URL.
- **410 Gone**: If /tmp artifacts expired (serverless cold start).

## Storage Requirements

Current (zip approach):
- ~10-50 KB per project zip in `/tmp`
- Ephemeral — lost on serverless cold start

Production (compiled APK):
- ~5-15 MB per APK
- Persistent storage needed (Vercel Blob, S3)
- Consider cleanup policy (delete after 30 days?)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build artifacts expired | Rebuild — /tmp is cleared on cold start |
| "App must be published" | Publish the app first |
| "Plan restricted" | Upgrade to PRO or AGENCY |
| Tar creation fails | Fallback JSON file is created instead |
| Download returns 410 | Rebuild — artifacts are ephemeral |
