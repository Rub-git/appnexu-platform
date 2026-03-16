# Production Checklist — Antigravity AnyApp

## Required Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) | ✅ |
| `AUTH_SECRET` | NextAuth.js secret (≥32 chars, `openssl rand -base64 32`) | ✅ |
| `AUTH_TRUST_HOST` | Set to `true` for Vercel deployment | ✅ |
| `AUTH_URL` / `NEXTAUTH_URL` | Full production URL (e.g., `https://app.example.com`) | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) | ✅ for billing |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_...` or `pk_test_...`) | ✅ for billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) | ✅ for billing |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for PRO plan | ✅ for billing |
| `STRIPE_AGENCY_PRICE_ID` | Stripe Price ID for AGENCY plan | ✅ for billing |
| `NEXT_PUBLIC_APP_DOMAIN` | Your production domain (e.g., `anyapp.io`) | ✅ for custom domains |
| `QSTASH_TOKEN` | Upstash QStash API token | ✅ for production queue |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash signing key (current) | ✅ for production queue |
| `QSTASH_NEXT_SIGNING_KEY` | QStash signing key (next) | ✅ for production queue |
| `JOB_SECRET` | Shared secret for dev-mode inline jobs | Optional (dev only) |

> ⚠️ Never prefix server-only secrets with `NEXT_PUBLIC_`. Only `NEXT_PUBLIC_APP_DOMAIN` should be public.

---

## Neon PostgreSQL Setup

1. Create a Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string: `postgresql://user:pass@host/dbname?sslmode=require`
3. Set `DATABASE_URL` in Vercel environment variables
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
5. Verify with:
   ```bash
   npx prisma studio
   ```

---

## Stripe Setup

### Products & Prices
1. Create two Products in Stripe Dashboard:
   - **PRO** — $19/month (or your pricing)
   - **AGENCY** — $49/month (or your pricing)
2. Each product should have one recurring Price. Copy both Price IDs.

### Webhook Configuration
1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Add endpoint: `https://YOUR_DOMAIN/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET`

### Local Testing with Stripe CLI
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret for local .env.local
stripe trigger checkout.session.completed
```

---

## Vercel Deployment

### Steps
1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Set **all** required environment variables
4. Deploy

### Build Configuration
- Framework: **Next.js** (auto-detected)
- Build Command: `npx prisma generate && next build`
- Install Command: `npm install`

### Post-Deployment Checklist
- [ ] Visit production URL — landing page loads
- [ ] Sign up a test user — registration works
- [ ] Sign in — auth flow works
- [ ] Create an app — app appears in dashboard
- [ ] Publish an app — public URL works at `/app/[slug]`
- [ ] Test Stripe checkout (use test keys first)
- [ ] Verify webhook fires (check Stripe Dashboard → Webhooks → Events)
- [ ] Test custom domain (if configured)

---

## Custom Domain DNS Configuration

### Platform Domain (for the dashboard)
1. Add your domain in Vercel → Domains
2. Set DNS:
   - `A` record → `76.76.21.21`
   - or `CNAME` → `cname.vercel-dns.com`

### Per-App Custom Domains
For each user-added custom domain:
1. User adds domain in app settings (e.g., `myapp.example.com`)
2. User creates DNS record:
   - `CNAME` → `cname.vercel-dns.com`
3. Add the domain in Vercel → Domains (or use Vercel API)
4. Middleware auto-rewrites custom domain traffic to `/app/_domain/[domain]`

---

## Deployment Order

1. **Database** — Create Neon DB, get connection string
2. **Environment Variables** — Set all vars in Vercel
3. **Deploy** — Push and deploy
4. **Migrate** — Run `npx prisma migrate deploy` (or Vercel auto-runs via build command)
5. **Verify** — Run post-deployment checklist above
6. **Stripe Webhook** — Add production webhook URL

---

## Rollback Guidance

- Vercel supports **instant rollback** to any previous deployment
- Database migrations should be backward-compatible
- If a migration is breaking, restore from Neon's point-in-time recovery
- Keep the previous deployment URL bookmarked for quick comparison

---

## Common Troubleshooting

| Issue | Fix |
|---|---|
| "Stripe not configured" | Verify `STRIPE_SECRET_KEY` is set in Vercel env |
| Login doesn't work | Check `AUTH_SECRET` matches between deployments; clear cookies |
| "App not found" on public URL | Verify app status is `PUBLISHED`; check slug exists |
| Custom domain 404 | Verify DNS propagation; domain must be added in Vercel Domains too |
| Webhook signature fails | Verify `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint |
| Build fails on Prisma | Ensure `postinstall` or `buildCommand` includes `prisma generate` |
| Middleware redirect loop | Check `NEXT_PUBLIC_APP_DOMAIN` matches your actual domain |
| Database connection error | Verify `DATABASE_URL` has `?sslmode=require` for Neon |

---

## Security Notes

- All API routes validate ownership server-side
- Passwords are hashed with bcrypt (cost factor 12)
- JWT sessions expire after 30 days
- Rate limiting is applied to auth, analyze, and generate endpoints
- Stripe webhook signature is verified before processing
- `server-only` package prevents importing server modules in client bundles
- No secrets are exposed via `NEXT_PUBLIC_*` (only domain name)

---

## Monitoring

- **Vercel**: Runtime logs for serverless function errors
- **Stripe Dashboard**: Webhook delivery status, failed payments
- **Neon Dashboard**: Database metrics, query performance
- **Application Logs**: Structured JSON in production (see `src/lib/logger.ts`)



---

## App Analytics

### Data Model
- **AppAnalyticsEvent**: Raw event log (PAGE_VIEW, INSTALL_CLICK, PUBLISHED, UNIQUE_VISIT)
- **AppAnalyticsSummary**: Aggregated daily stats per app (upserted on each event)
- **AppProject counters**: Denormalized `totalVisits`, `uniqueVisitors`, `totalInstalls` for fast reads

### Privacy Approach (GDPR-Friendly)
- ✅ No raw IP addresses stored — uses djb2 hash of IP+UA for uniqueness
- ✅ No personally identifiable information (PII)
- ✅ Minimal data collection: device type, browser type, referrer hostname only
- ✅ Visitor hashes are ephemeral identifiers (24h uniqueness window)
- ✅ All analytics data cascades on app deletion

### Bot Detection
- Checks user agent against 40+ known bot patterns (search engines, social, monitoring, CLI tools)
- Rejects requests with missing/short user agents
- Detects headless browsers (Puppeteer, Phantom, Selenium)
- Bots receive `200 OK` silently — no tracking recorded

### Rate Limiting
- `/api/analytics/track`: 60 requests/minute per IP
- Uses existing in-memory rate limiter (`src/lib/rate-limit.ts`)

### Security
- Analytics read endpoints require authentication + ownership verification
- Only PUBLISHED apps are tracked (except PUBLISHED event itself)
- Tracking endpoint is public but rate-limited and bot-filtered

### Performance
- Database indexes on: `appId`, `appId+timestamp`, `eventType`, `appId+date`
- Unique composite index on `AppAnalyticsSummary(appId, date)` for efficient upserts
- Denormalized counters on AppProject avoid expensive aggregation queries
- Analytics errors never break the main application flow (try/catch with silent fail)

### API Endpoints
- `POST /api/analytics/track` — Public tracking endpoint
- `GET /api/apps/[id]/analytics?period=7d|30d|all` — Analytics summary (auth required)
- `GET /api/apps/[id]/analytics/chart?period=7d|30d|all` — Chart time-series data (auth required)

### Dashboard UI
- Analytics mini-summary on app cards (visits, visitors, installs)
- Dedicated analytics page: `/dashboard/apps/[id]/analytics`
- Line charts via Recharts library
- Recent activity table with event details
- Period selector (7 days, 30 days, all time)
- Fully internationalized (English + Spanish)



---

## Internal Admin Panel

### Admin Role System
- **Role enum**: `USER` (default) and `ADMIN`
- Role stored in JWT token and session for fast access
- Database-level role check on every admin page load and API call

### Admin Bootstrap
To create the first admin user:
```bash
# Promote an existing user to admin
npx tsx scripts/seed-admin.ts admin@example.com

# Create a new admin user with password
npx tsx scripts/seed-admin.ts admin@example.com securePassword123
```

### Access Control (Defense in Depth)
1. **Middleware layer**: `/admin` routes require session token (same as `/dashboard`)
2. **Layout layer**: `requireAdmin()` checks DB role — redirects non-admins to dashboard
3. **API layer**: Every `/api/admin/*` endpoint calls `requireAdmin()` independently
4. **No client-side-only checks**: All authorization is server-side

### Admin Pages
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard overview with platform totals and recent activity |
| `/admin/users` | User management with search, plan/role filters, pagination |
| `/admin/apps` | App management with search, status/plan filters, pagination |
| `/admin/billing` | Billing overview with Stripe linkage status and plan distribution |
| `/admin/health` | Queue health, system status, failed job inspection + retry |

### Admin API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/stats` | GET | Platform-wide statistics |
| `/api/admin/users` | GET | Paginated user list with filters |
| `/api/admin/apps` | GET | Paginated app list with filters |
| `/api/admin/billing` | GET | Billing/subscription overview |
| `/api/admin/health` | GET | Queue & system health |
| `/api/admin/apps/[id]/retry` | POST | Retry a failed generation job |

### Admin Actions (Safe Only)
- ✅ View user details, app details, billing state
- ✅ Inspect failed jobs with failure reasons
- ✅ Retry failed generation jobs
- ✅ View queue status (queued, generating)
- ✅ View system health (DB, Stripe, QStash)
- ❌ No user deletion from admin panel
- ❌ No app deletion from admin panel
- ❌ No plan changes from admin panel (use Stripe dashboard)

### Performance
- All admin queries use pagination (default 20, max 100)
- Database indexes on: `role`, `plan`, `createdAt`, `status`
- Overview stats run queries in parallel with `Promise.all`
- No N+1 queries — all relations loaded via `select` and `include`

### Security Notes
- Stripe customer IDs are truncated in UI (never fully exposed)
- No Stripe secrets or API keys exposed in admin panel
- Admin role can only be set via database seed script or direct DB access
- All query parameters are validated and sanitized
- Admin actions are logged via the structured logger

### Environment Variables
No new environment variables required. Admin panel uses existing auth and database config.
