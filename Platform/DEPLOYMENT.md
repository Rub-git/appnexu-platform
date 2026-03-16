# Deployment Guide - Antigravity AnyApp

Complete guide for deploying the Antigravity AnyApp SaaS platform to production.

---

## Prerequisites

- Node.js 18+ installed
- A [Vercel](https://vercel.com) account
- A [Neon](https://neon.tech) PostgreSQL database
- A [Stripe](https://stripe.com) account (for payments)
- A custom domain (optional)

---

## 1. Database Setup (Neon PostgreSQL)

### Create a Neon Database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project (e.g., "anyapp-production")
3. Choose a region close to your users (e.g., `us-east-2`)
4. Copy the connection string from the dashboard

Your connection string will look like:
```
postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Run Migrations

```bash
# Set the DATABASE_URL environment variable
export DATABASE_URL="postgresql://username:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate deploy

# (Optional) Seed the database
# npx prisma db seed
```

### Verify Database

```bash
# Open Prisma Studio to inspect your database
npx prisma studio
```

### Schema Overview

The PostgreSQL schema includes:

| Model | Description |
|-------|-------------|
| `User` | User accounts with plan (FREE/PRO/AGENCY) and Stripe fields |
| `AppProject` | PWA apps with slug, status, custom domain support |
| `Account` | NextAuth OAuth provider accounts |
| `Session` | NextAuth sessions |
| `VerificationToken` | Email verification tokens |

Key fields added for production:
- `User.stripeCustomerId` - Links to Stripe customer
- `AppProject.customDomain` - Custom domain mapping (unique)
- `AppProject.status` - Includes GENERATING state for publish flow

---

## 2. Stripe Setup (Payments)

### Create Stripe Products

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create two subscription products:

**Pro Plan ($19/month)**
- Name: "Pro Plan"
- Price: $19.00/month (recurring)
- Copy the Price ID (e.g., `price_1ABC...`)

**Agency Plan ($49/month)**
- Name: "Agency Plan"
- Price: $49.00/month (recurring)
- Copy the Price ID (e.g., `price_2DEF...`)

### Configure Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add an endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Copy the Webhook Signing Secret (starts with `whsec_`)

### Get API Keys

1. Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
2. Copy:
   - **Publishable key** (`pk_live_...` or `pk_test_...`)
   - **Secret key** (`sk_live_...` or `sk_test_...`)

### Test with Stripe CLI (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test a checkout
stripe trigger checkout.session.completed
```

---

## 3. Vercel Deployment

### Quick Deploy

[![Deploy with Vercel](https://i.ytimg.com/vi/zRJcQ9PFSHE/hqdefault.jpg)

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time - will create project)
vercel

# Deploy to production
vercel --prod
```

### Environment Variables

Set these in Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_URL` | ✅ | Your production URL (e.g., `https://app.example.com`) |
| `AUTH_TRUST_HOST` | ✅ | Set to `true` |
| `NEXTAUTH_URL` | ✅ | Same as AUTH_URL |
| `NEXTAUTH_SECRET` | ✅ | Same as AUTH_SECRET |
| `STRIPE_SECRET_KEY` | ⚡ | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | ⚡ | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | ⚡ | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | ⚡ | Stripe Price ID for Pro plan |
| `STRIPE_AGENCY_PRICE_ID` | ⚡ | Stripe Price ID for Agency plan |
| `NEXT_PUBLIC_APP_DOMAIN` | 🌐 | Your domain for custom domain detection |

✅ = Required, ⚡ = Required for payments, 🌐 = Required for custom domains

### Build Configuration

The `vercel.json` is already configured with:
- Prisma generation in build command
- Extended function durations for webhooks and analysis
- Proper caching headers for service workers and icons
- CDN-ready static asset configuration

### Post-Deployment Checklist

- [ ] Verify auth works (sign up, sign in, sign out)
- [ ] Test app creation flow
- [ ] Verify PWA manifest generation (`/pwa/[id]/manifest.json`)
- [ ] Test Stripe checkout flow
- [ ] Configure Stripe webhook URL
- [ ] Test publishing/unpublishing apps
- [ ] Verify custom domain setup (if applicable)

---

## 4. Custom Domain Setup

### Platform Domain

1. In Vercel Dashboard, go to your project > Settings > Domains
2. Add your custom domain (e.g., `app.example.com`)
3. Follow Vercel's DNS configuration instructions

### App Custom Domains (Per-App)

Users can assign custom domains to their published apps:

1. User sets custom domain in app settings (e.g., `myapp.example.com`)
2. User adds a CNAME record in their DNS provider:
   ```
   Type: CNAME
   Name: myapp
   Value: cname.vercel-dns.com
   ```
3. Add the domain in Vercel Dashboard > Domains (or via Vercel API)
4. The middleware will detect the custom domain and route to the correct app

### How Custom Domain Routing Works

1. Request comes in for `myapp.example.com`
2. Middleware checks if hostname is a known platform host
3. If not, it rewrites to `/app/_domain/myapp.example.com`
4. The handler looks up the app by `customDomain` field
5. If found and published, serves the app page

### Vercel Domain API (Automation)

For automated domain provisioning, use the Vercel API:
```bash
curl -X POST "https://api.vercel.com/v10/projects/{projectId}/domains" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "myapp.example.com"}'
```

---

## 5. Architecture Overview

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/analyze` | POST | Analyze website URL |
| `/api/generate` | POST | Create new app |
| `/api/apps/[id]` | GET/PATCH/DELETE | App CRUD |
| `/api/apps/[id]/publish` | POST/DELETE | Publish/unpublish app |
| `/api/apps/[id]/domain` | PATCH/DELETE | Custom domain management |
| `/api/apps/check-limit` | GET | Check plan limits |
| `/api/stripe/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe webhooks |
| `/pwa/[id]/manifest.json` | GET | Dynamic PWA manifest |
| `/pwa/[id]/sw.js` | GET | Dynamic service worker |

### Publishing Flow

```
DRAFT → GENERATING → PUBLISHED
  ↑                      ↓
  └──── (unpublish) ─────┘
```

1. User clicks "Publish" → Status set to `GENERATING`
2. System validates app data (name, URL, icons)
3. Manifest and service worker endpoints verified
4. Status updated to `PUBLISHED`
5. App accessible at `/app/[slug]` and optional custom domain

### Plan Limits

| Plan | Apps | Price | Features |
|------|------|-------|----------|
| FREE | 1 | $0/mo | PWA generation, public link |
| PRO | 10 | $19/mo | Custom domain, priority support |
| AGENCY | ∞ | $49/mo | Unlimited, white label |

---

## 6. Monitoring & Maintenance

### Database Monitoring (Neon)

- Monitor query performance in Neon Dashboard
- Set up connection pooling for high traffic
- Enable branching for staging environments

### Error Monitoring

Consider adding:
- [Sentry](https://sentry.io) for error tracking
- [Vercel Analytics](https://vercel.com/analytics) for performance
- [Stripe Dashboard](https://dashboard.stripe.com) for payment monitoring

### Scaling Tips

- **Database**: Neon auto-scales, but consider connection pooling with PgBouncer
- **Serverless**: Vercel functions auto-scale; monitor cold starts
- **CDN**: Static assets (icons, offline.html) are automatically cached by Vercel Edge
- **Prisma**: The singleton pattern in `src/lib/prisma.ts` prevents connection exhaustion

---

## 7. Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd antigravity-anyapp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Local with SQLite (Quick Start)

For quick local development without PostgreSQL, you can temporarily use SQLite by changing the schema provider back. However, the production schema uses PostgreSQL features.

---

## Troubleshooting

### Common Issues

**"PrismaClientInitializationError"**
- Ensure `DATABASE_URL` is set correctly
- Run `npx prisma generate` after any schema changes
- Check Neon dashboard for connection limits

**NextAuth not working in production**
- Ensure `AUTH_SECRET`, `AUTH_URL`, and `AUTH_TRUST_HOST` are set
- Make sure cookies are being set (check `__Secure-authjs.session-token`)
- Verify the production URL matches `AUTH_URL`

**Stripe webhooks failing**
- Verify the webhook endpoint URL matches your deployment
- Check that `STRIPE_WEBHOOK_SECRET` is correct
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

**Custom domains not working**
- Ensure the domain is added in both the app settings AND Vercel Dashboard
- Verify DNS CNAME record points to `cname.vercel-dns.com`
- Check `NEXT_PUBLIC_APP_DOMAIN` is set correctly
- Allow DNS propagation time (up to 48 hours)

**Build failures on Vercel**
- Check that `prisma generate` runs before `next build` (configured in `vercel.json`)
- Verify all environment variables are set in Vercel project settings
- Check for TypeScript errors: `npx tsc --noEmit`
