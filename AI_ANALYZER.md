# AI Website Analyzer

## Overview

Automatically analyzes a target website's HTML to generate intelligent suggestions for app name, navigation structure, color scheme, and quick actions. Uses LLM (Abacus.AI) with a heuristic fallback.

## Architecture

```
┌──────────────┐   POST /api/apps/[id]/analyze   ┌─────────────────┐
│  Edit/Preview │ ───────────────────────────────▶ │  analyze route   │
│  Page (UI)    │                                  │  (auth+ownership │
└──────┬───────┘                                  │  +quota+ratelim) │
       │                                           └───────┬─────────┘
       │  GET /api/apps/[id]/suggestions                   │
       ▼                                                   ▼
┌──────────────┐                              ┌────────────────────┐
│  AiSuggestions│                              │  ai-analyzer.ts     │
│  Panel (UI)   │                              │  1. fetch website   │
└──────────────┘                              │  2. cheerio parse   │
                                               │  3. LLM or fallback│
                                               └────────────────────┘
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ABACUS_API_KEY` | No | Abacus.AI API key. If not set, heuristic fallback is used. |
| `ABACUS_DEPLOYMENT_ID` | No | Deployment ID for predict endpoint. |

## Timeouts & Limits

| Parameter | Value | Notes |
|-----------|-------|-------|
| Website fetch timeout | 15 seconds | Aborts if site is too slow |
| LLM API timeout | 30 seconds | Falls back to heuristic |
| Max HTML size | 2 MB | Truncated if larger |
| Rate limit | 10 req/hour/user | In-memory rate limiter |
| FREE plan quota | 5 analyses/month | Enforced server-side |
| PRO/AGENCY quota | Unlimited | — |

## Fallback Behavior

When the LLM is unavailable or fails:
1. Website HTML is still fetched and parsed with Cheerio
2. Title → extracted from `<title>` or `og:title`
3. Navigation → extracted from `<nav>` and `<header>` links
4. Colors → extracted from `theme-color` and `msapplication-TileColor` meta tags
5. Actions → detected from `tel:` and `mailto:` links + default (Directions, Share)

## Security

- **SSRF Prevention**: URLs validated by `safeUrlSchema` in `validations.ts` — blocks localhost, private IPs, metadata endpoints.
- **Ownership**: Only app owner can trigger analysis.
- **Rate limiting**: 10 requests/hour per user.
- **Plan quotas**: FREE users limited to 5 analyses/month.
- **HTML parsing**: Cheerio is safe (no JS execution). Parse errors caught gracefully.

## API Endpoints

### `POST /api/apps/[id]/analyze`
- **Auth**: Required + ownership check.
- **Rate limit**: 10/hour/user.
- **Plan quota**: Enforced.
- **Idempotent**: ANALYZING status prevents double-trigger.
- **On failure**: Status resets to FAILED (safe to retry).

### `GET /api/apps/[id]/suggestions`
- **Auth**: Required + ownership check.
- **Returns**: Current status + suggestion data.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Always falls back to heuristic | Check `ABACUS_API_KEY` env var |
| Analysis stuck in ANALYZING | Status resets to FAILED on error; may need manual DB fix if process crashed |
| "URL not allowed" error | SSRF protection blocked the URL (internal/private address) |
| Empty suggestions | Website may have no `<nav>`, `<title>`, or meta tags |
| Quota exceeded | FREE users: 5/month. Upgrade to PRO for unlimited. |
| Timeout errors | Target website is slow; 15s fetch limit cannot be increased on serverless |
