# App Templates Marketplace

## Overview

The Templates Marketplace provides pre-configured app templates that users can apply when creating new apps. Templates include navigation structure, quick actions, color schemes, and icon suggestions.

## Architecture

```
┌─────────────────────┐    GET /api/templates    ┌──────────────┐
│  Templates Page      │ ◀───────────────────────▶│  PostgreSQL   │
│  /[locale]/templates │                          │  AppTemplate  │
└──────┬──────────────┘                          └──────────────┘
       │ sessionStorage                                 ▲
       ▼                                                │
┌─────────────────────┐    POST /api/generate     ┌─────┴────────┐
│  Create App Page     │ ────────────────────────▶ │ Server-side   │
│  /dashboard/create   │    (with templateSlug)   │ plan-gates.ts │
└─────────────────────┘                          └──────────────┘
```

## Templates

| Name | Slug | Category | Premium |
|------|------|----------|---------|
| Generic Website | generic-website | BUSINESS | ❌ |
| Church | church | CHURCH | ❌ |
| Restaurant | restaurant | FOOD | ❌ |
| Clinic | clinic | HEALTH | ✅ |
| Ecommerce | ecommerce | BUSINESS | ✅ |
| Course / Education | course-education | EDUCATION | ✅ |
| Booking / Services | booking-services | SERVICES | ❌ |

## Premium Template Access

- **FREE plan**: Can browse and preview all templates, but **cannot use** premium templates (server-enforced in `/api/generate`).
- **PRO / AGENCY plan**: Full access to all templates.
- Enforcement is in `src/lib/plan-gates.ts` → `canUsePremiumTemplate()`.

## API Endpoints

### `GET /api/templates`
- **Auth**: Not required (public listing).
- **Filters**: `?category=BUSINESS`, `?premium=true`
- **Response**: Array of templates (selected fields only, no internal IDs leaked).

### `GET /api/templates/[slug]`
- **Auth**: Not required.
- **Validation**: Slug must match `/^[a-z0-9-]+$/`.

### `POST /api/generate` (with template)
- **Auth**: Required.
- **Body**: `{ url, title, templateSlug? }`
- **Server-side checks**: Plan limit, premium template gate, rate limit.

## Production Deployment

### Seed Templates

```bash
npx tsx prisma/seed-templates.ts
```

### Add New Templates

1. Add template object to `prisma/seed-templates.ts`
2. Run seed script
3. Templates are upserted by slug (safe to re-run)

### Environment Variables

No additional variables needed for templates.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No templates showing | Run `npx tsx prisma/seed-templates.ts` |
| Category filter not working | Ensure category value matches `TemplateCategory` enum |
| Premium template bypass | Check `plan-gates.ts` is imported in `/api/generate` |
| Template configJson invalid | Validate JSON structure matches expected schema |
