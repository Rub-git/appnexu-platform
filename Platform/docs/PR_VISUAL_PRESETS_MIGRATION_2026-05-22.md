# PR Summary: Visual Presets + AI Branding Migration

## Context
Appnexu is shifting from full app templates to lightweight visual presets and AI-assisted branding.
Goal: keep website content and structure intact while auto-adapting visual experience.

## What Changed

### 1) Runtime migration from templates to visual presets
- Added visual preset catalog and recommendation logic:
  - `src/lib/visual-presets.ts`
  - `src/app/api/visual-presets/route.ts`
  - `src/app/api/visual-presets/recommend/route.ts`
- Reworked visual selector page to consume presets API:
  - `src/app/[locale]/templates/page.tsx`
- Updated create flow to use selected/auto-recommended visual preset:
  - `src/app/[locale]/(dashboard)/dashboard/create/page.tsx`
- Updated generate endpoint to persist and apply only `visualPresetSlug`:
  - `src/app/api/generate/route.ts`
- Removed legacy templates runtime API endpoints:
  - `src/app/api/templates/route.ts`
  - `src/app/api/templates/[slug]/route.ts`

### 2) Data model and migration
- Prisma model now stores visual preset reference directly on apps:
  - `prisma/schema.prisma`
    - Removed `templateId`
    - Added `visualPresetSlug`
- Added migration:
  - `prisma/migrations/20260522_add_visual_preset_slug/migration.sql`
- Migration made idempotent and backward-compatible for DBs with/without legacy `template_id`.

### 3) Admin and terminology alignment
- Admin stats switched from AppTemplate metrics to visual preset usage metrics:
  - `src/app/api/admin/stats/route.ts`
  - `src/app/[locale]/admin/page.tsx`
- Plan gate naming aligned to visual presets:
  - `src/lib/plan-gates.ts`
- Validation schema removed legacy `templateSlug` input:
  - `src/lib/validations.ts`
- Copy/branding wording updated to visual experience and AI branding:
  - `messages/en.json`
  - `messages/es.json`
  - `src/config/brand.ts`

## Smoke Validation
- `npm run db:migrate:direct:status` -> Database schema is up to date.
- `npm run build` -> successful compile + typecheck + static generation.
- Source grep check confirms no `/api/templates` runtime references under `src`.

## Notes
- Existing `AppTemplate` table/model can remain as historical data; no runtime dependency remains in `src`.
- Next.js warning about middleware/proxy deprecation is non-blocking and pre-existing.

## Risks and Mitigations
- Risk: migration lock/timeouts on pooled connections.
  - Mitigation: resolved and deployed migration via direct connection script.
- Risk: heterogeneous DB state across environments.
  - Mitigation: migration SQL is idempotent and conditional around legacy columns/tables.

## Rollback Strategy
- Revert commit and redeploy app.
- If needed, restore DB from backup/snapshot prior to migration.
- No destructive drop on `AppTemplate`; rollback risk is limited to `AppProject.visual_preset_slug` adoption.
