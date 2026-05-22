# Deploy Go/No-Go - 2026-05-22

## Current Status

### Go Signals
- Production build passes (`npm run build`).
- Direct migration status is up to date.
- Billing seed data exists in DB:
  - 3 plans (`starter`, `pro`, `business`)
  - 3 billing plan limit rows

### No-Go / Verify Before Deploy
- `STRIPE_PUBLISHABLE_KEY` is missing in local env files.
- Working tree includes many changes plus extra untracked entries outside `Platform` scope (`../package.json`, `../node_modules/`).

## Required Env Vars (Vercel)
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_AGENCY_PRICE_ID`

## Release Execution Order
1. Add missing env var in Vercel: `STRIPE_PUBLISHABLE_KEY`.
2. Review and stage only intended release files under `Platform`.
3. Commit and push branch.
4. Deploy in Vercel.
5. Confirm migrations in target DB (`npx prisma migrate deploy` if needed by pipeline).
6. Verify Stripe webhook endpoint and events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. Run smoke checks:
   - login/signup
   - dashboard list/create/edit
   - pricing/upgrade button
   - billing page and usage chart
   - webhook delivery in Stripe dashboard

## Suggested Commit Scope
Include only changes in:
- `Platform/prisma/**`
- `Platform/src/**`
- `Platform/scripts/**`
- `Platform/docs/**` (optional)
- `Platform/package-lock.json` (if changed by actual app dependencies)

Exclude accidental root-level workspace files unless intentionally part of release.
