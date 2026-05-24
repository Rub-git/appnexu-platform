# 🚀 GitHub Upload & Vercel Deployment Instructions

## Repository Status Report

| Item | Status |
|------|--------|
| Git initialized | ✅ |
| All changes committed | ✅ |
| .gitignore configured | ✅ |
| No sensitive data in tracked files | ✅ |
| README.md complete | ✅ |
| package.json metadata updated | ✅ |
| Binary files removed from tracking | ✅ |
| Total tracked files | ~130 |
| Total commits | 11 |

---

## Step 1: Create a New GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: `appnexu` (or your preferred name)
3. **Description**: `Turn any website into an installable app — No-code PWA & APK generator`
4. **Visibility**: Private (recommended) or Public
5. ⚠️ **Do NOT** initialize with README, .gitignore, or license (your repo already has these)
6. Click **Create repository**

---

## Step 2: Push Code to GitHub

After creating the repository, run these commands:

```bash
cd /home/ubuntu/antigravity-anyapp

# Update the remote URL to your new repository
git remote set-url origin https://github.com/YOUR_USERNAME/appnexu.git

# Push all commits
git push -u origin main
```

If you created a fresh repository and the above fails, try:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/appnexu.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3a. Import Project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your `appnexu` repository
4. Vercel will auto-detect Next.js

### 3b. Configure Build Settings
These should be auto-detected, but verify:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Output Directory**: `.next`

### 3c. Add Environment Variables
Add these in the Vercel dashboard under **Environment Variables**:

**Required:**
| Variable | Value |
|----------|-------|
| `AUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `DATABASE_URL` | Your PostgreSQL connection string (e.g., from [Neon](https://neon.tech)) |

**Optional (for billing):**
| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRO_PRICE_ID` | `price_...` |
| `STRIPE_AGENCY_PRICE_ID` | `price_...` |

**Optional (for queue/domain):**
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_DOMAIN` | Your production domain |
| `QSTASH_TOKEN` | From [Upstash Console](https://console.upstash.com) |
| `QSTASH_CURRENT_SIGNING_KEY` | From Upstash |
| `QSTASH_NEXT_SIGNING_KEY` | From Upstash |
| `JOB_SECRET` | A strong random secret |

### 3d. Deploy
Click **Deploy** and wait for the build to complete.

---

## Step 4: Post-Deployment Setup

### 4a. Run Database Migrations
After deployment, run migrations against your production database:

```bash
# Option 1: Via Vercel CLI
npx vercel env pull .env.production.local
DATABASE_URL="your-production-db-url" npx prisma migrate deploy

# Option 2: Connect to your Neon database directly
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### 4b. Seed Templates (Optional)
```bash
DATABASE_URL="your-production-db-url" npx tsx prisma/seed-templates.ts
```

### 4c. Create Admin User (Optional)
```bash
DATABASE_URL="your-production-db-url" npx tsx scripts/seed-admin.ts
```

### 4d. Configure Stripe Webhook
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-vercel-domain.vercel.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` env var in Vercel

### 4e. Configure Custom Domain (Optional)
1. In Vercel → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Set `NEXT_PUBLIC_APP_DOMAIN` env var to your domain

---

## ⚠️ Warnings & Notes

1. **No sensitive data is committed** — all secrets are in `.env.local` (gitignored)
2. **Database**: You need a PostgreSQL database. [Neon](https://neon.tech) offers a free tier that works great with Vercel
3. **Stripe**: Billing features are optional — the app works without Stripe keys
4. **QStash**: Queue features fall back to inline processing without QStash keys
5. The `prisma/dev.db.backup` (SQLite) has been removed from tracking
6. PDF copies of documentation have been removed (markdown originals remain)

---

## Files Being Pushed

The repository contains ~130 tracked files including:
- ✅ Next.js application code (src/)
- ✅ Prisma schema & migrations
- ✅ i18n translation files (en, es)
- ✅ Public assets (icons, manifest, service workers)
- ✅ Documentation (markdown)
- ✅ Configuration files (vercel.json, tsconfig, eslint, etc.)
- ❌ No node_modules
- ❌ No .env files
- ❌ No database files
- ❌ No build artifacts
- ❌ No PDF binaries
