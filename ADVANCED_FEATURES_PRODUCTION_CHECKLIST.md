# Advanced Features — Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Variables

| Variable | Feature | Required | Default |
|----------|---------|----------|---------|
| `DATABASE_URL` | All | ✅ | — |
| `AUTH_SECRET` | All | ✅ | — |
| `ABACUS_API_KEY` | AI Analyzer | ❌ | Falls back to heuristic |
| `ABACUS_DEPLOYMENT_ID` | AI Analyzer | ❌ | Empty string |
| `STRIPE_SECRET_KEY` | Plan gating | ✅ | — |
| `STRIPE_WEBHOOK_SECRET` | Plan gating | ✅ | — |
| `NEXTAUTH_URL` | APK download URLs | ✅ | — |

### 2. Database Migrations

```bash
npx prisma migrate deploy
```

New indexes added:
- `AppProject.aiAnalysisStatus`
- `AppProject.apkBuildStatus`
- `AppProject.templateId`
- `AppTemplate.category` (already existed)
- `AppTemplate.isPremium` (already existed)
- `AppTemplate.slug` (already existed)

### 3. Seed Data

```bash
npx tsx prisma/seed-templates.ts
```

Verify templates exist:
```sql
SELECT name, slug, "is_premium", category FROM "AppTemplate";
```

### 4. Security Configurations

- [x] SSRF prevention on URL inputs (`validations.ts`)
- [x] Ownership verification on all `/api/apps/[id]/*` routes
- [x] Rate limiting on expensive operations
  - AI analyze: 10/hour/user
  - APK export: 5/day/user
  - App generation: 5/minute/user
- [x] Plan gating server-side (`plan-gates.ts`)
  - Premium templates: PRO/AGENCY only
  - APK export: PRO/AGENCY only
  - AI analysis quota: FREE=5/month, PRO/AGENCY=unlimited
- [x] HTML escaping in APK builder output
- [x] LLM output sanitization (length limits, schema validation)
- [x] No stack traces in API responses (production mode)

### 5. Rate Limiting

Current implementation uses **in-memory rate limiting**. This resets on cold starts in serverless.

**For production scale**, consider:
- Upstash Redis rate limiter (`@upstash/ratelimit`)
- Vercel KV-based rate limiter
- Cloudflare rate limiting (if using CF)

### 6. Monitoring Recommendations

- Monitor `/api/admin/stats` for:
  - Failed jobs count trending up
  - APK build queue growing
  - AI analysis failure rate
- Set alerts for:
  - `aiAnalysisStatus = 'ANALYZING'` stuck > 5 minutes
  - `apkBuildStatus = 'BUILDING'` stuck > 5 minutes
  - Error rate > 5% on any endpoint

---

## Feature Readiness Assessment

### ✅ Templates Marketplace — READY

| Check | Status |
|-------|--------|
| Templates load at /[locale]/templates | ✅ |
| Category filters work | ✅ |
| Preview modal displays correctly | ✅ |
| Premium badge shows | ✅ |
| Premium restriction (server-side) | ✅ |
| Template config applies to new app | ✅ |
| Usage counter increments | ✅ |
| Input validation on slug | ✅ |
| Does not break publish flow | ✅ |

### ✅ AI Website Analyzer — READY

| Check | Status |
|-------|--------|
| Analysis triggers correctly | ✅ |
| Status transitions work | ✅ |
| Suggestions saved to DB | ✅ |
| Accept All applies suggestions | ✅ |
| Heuristic fallback works | ✅ |
| Invalid URLs fail gracefully | ✅ |
| Broken websites handled | ✅ |
| Timeout (15s fetch, 30s LLM) | ✅ |
| Malformed HTML handled | ✅ |
| Ownership check | ✅ |
| Rate limiting | ✅ |
| Plan quota enforcement | ✅ |
| SSRF prevention | ✅ |

### ⚠️ APK Export — NEEDS WORK (for real APK builds)

| Check | Status | Notes |
|-------|--------|-------|
| Only PUBLISHED apps | ✅ | |
| Status transitions | ✅ | |
| Download works | ✅ | Zip file, not real APK |
| Retry flow | ✅ | |
| Duplicate build prevention | ✅ | |
| Ownership check | ✅ | |
| Plan gating (PRO/AGENCY) | ✅ | |
| Rate limiting | ✅ | |
| **Real APK compilation** | ❌ | Requires external build worker |
| **Persistent storage** | ❌ | /tmp is ephemeral on serverless |
| **Vercel timeout safe** | ⚠️ | Zip generation works; real builds won't |

**The zip-generation approach is production-safe and useful as an MVP.** Users get a ready-to-build Capacitor project. Real APK compilation requires the async worker architecture documented in `APK_EXPORT.md`.

---

## Known Limitations & Risks

### Templates
- No template versioning (edits affect all future apps)
- No template preview images (uses color gradient instead)
- Template configJson not validated against a strict schema

### AI Analyzer
- In-memory rate limiter resets on serverless cold starts
- LLM results not cached (same URL analyzed twice = two API calls)
- No async/queue mode — analysis blocks the request
- FREE quota counter relies on `updatedAt` field, not a dedicated counter

### APK Export
- **Critical**: `/tmp` storage is ephemeral — download links break after cold start
- No Vercel Blob integration (documented but not implemented)
- No actual APK compilation (Capacitor project zip only)
- Build process is synchronous (blocks HTTP request)

---

## Rollback Procedures

### Templates
1. Templates are read-only data. To rollback: delete rows from `AppTemplate` table.
2. No impact on existing apps (templateId is just a reference).

### AI Analyzer
1. New DB fields are all nullable/have defaults — no schema rollback needed.
2. To disable: remove analyze route or set `ABACUS_API_KEY` to empty.
3. Existing suggestions in DB remain (harmless).

### APK Export
1. New DB fields are all nullable/have defaults — no schema rollback needed.
2. To disable: return 503 from export-apk route.
3. /tmp files auto-cleanup on restart.

### Database Migration Rollback
```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## Testing Procedures

### Templates
1. Visit `/en/templates` — verify grid loads
2. Click each category filter — verify filtering
3. Click "Preview" — verify modal content
4. Click "Use Template" on a free template — verify redirect to create page
5. As FREE user, try to create app with premium template slug via API — expect 403

### AI Analyzer
1. Create an app with a valid public URL
2. Click "Analyze" button on preview/edit page
3. Verify suggestions appear (name, colors, navigation)
4. Click "Accept All" — verify form fields update
5. Click "Re-analyze" — verify it works again
6. Test with an unreachable URL — verify error message
7. Test rate limit by sending 11 requests in quick succession

### APK Export
1. Publish an app first
2. On preview page, find APK export section
3. Click "Export APK" — verify build starts
4. Wait for completion — verify download button appears
5. Download the zip — verify it contains capacitor.config.json
6. As FREE user, try export via API — expect 403

---

## Recommended Next Steps Before Production

1. **Upgrade rate limiter** to Redis-based (Upstash) for cross-instance consistency
2. **Add Vercel Blob storage** for APK artifacts (replace /tmp)
3. **Set up build worker** for real APK compilation (GitHub Actions recommended)
4. **Add template preview images** for better marketplace UX
5. **Add AI analysis caching** to avoid duplicate LLM calls for same URL
6. **Add dedicated quota tracking** table instead of counting by updatedAt
7. **Add webhook/polling** for async AI analysis (currently blocks request up to 45s)
8. **Set up error monitoring** (Sentry/LogRocket) for production error tracking
9. **Load test** the analyze and export endpoints under concurrent users
10. **Add E2E tests** with Playwright for critical user flows
