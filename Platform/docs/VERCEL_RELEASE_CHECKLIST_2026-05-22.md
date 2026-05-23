# Vercel Release Checklist (Visual Presets Migration)

## 0) Scope
Release includes:
- Visual presets API + AI recommendation
- Generate/create flow migration to `visualPresetSlug`
- DB migration `20260522_add_visual_preset_slug`
- Legacy templates runtime API removal
- Admin stats migration to visual preset metrics

## 1) Pre-Deploy
- [ ] Branch up to date with main.
- [ ] `npm ci` completes.
- [ ] Prisma schema committed with migration directory.
- [ ] Local build succeeds:
  - `npm run build`

## 2) Environment Variables (Vercel)
Confirm these are set in Production/Preview where applicable:
- [ ] `DATABASE_URL`
- [ ] `AUTH_SECRET`
- [ ] `AUTH_URL`
- [ ] `AUTH_TRUST_HOST=true`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRO_PRICE_ID`
- [ ] `STRIPE_AGENCY_PRICE_ID`
- [ ] `NEXT_PUBLIC_APP_DOMAIN`
- [ ] `ABACUS_API_KEY` (if AI provider active)
- [ ] `ABACUS_DEPLOYMENT_ID` (if AI provider active)

## 3) Database Migration
Recommended for Supabase/pooled setups:
- [ ] Run direct migration before Vercel release:
  - `npm run db:migrate:direct`
- [ ] Verify status:
  - `npm run db:migrate:direct:status`
- [ ] Expect: `Database schema is up to date!`

## 4) Deploy
- [ ] Deploy preview first:
  - `vercel`
- [ ] Validate preview smoke tests (section 5).
- [ ] Promote to production:
  - `vercel --prod`

## 5) Smoke Tests (Preview + Prod)
- [ ] Open `/[locale]/templates` and verify visual presets list loads.
- [ ] Create app from dashboard create flow without manual preset selection.
- [ ] Verify app creation succeeds and persisted app has visual styling.
- [ ] Verify `/api/visual-presets` and `/api/visual-presets/recommend` return success.
- [ ] Verify `/api/templates` returns 404 (legacy removed).
- [ ] Check admin overview renders visual preset usage block.
- [ ] Validate billing upgrade buttons still work on pricing page.

## 6) Post-Deploy Observability
- [ ] Watch Vercel runtime logs for 30-60 min.
- [ ] Watch DB for migration errors / lock contention.
- [ ] Confirm no spike in 5xx for `/api/generate`, `/api/admin/stats`, `/api/visual-presets/*`.

## 7) Known Non-Blocking Warning
- Next.js warns middleware convention deprecation (move to proxy in future).
- This does not block current release.

## 8) Rollback
If release is unhealthy:
- [ ] Roll back to prior Vercel deployment.
- [ ] Revert commit in repo.
- [ ] If needed, restore DB snapshot (migration impact is limited and backward-safe).
