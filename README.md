<p align="center">
  <img src="public/images/appnexu-logo.jpg" alt="Appnexu" width="280" />
</p>

<h1 align="center">Appnexu</h1>

<p align="center">
  <strong>From website to app. Instantly.</strong><br/>
  No-code PWA & APK generator with AI analysis, templates marketplace, and SaaS billing.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Stripe-Billing-635BFF?logo=stripe" alt="Stripe" />
</p>

---

## ✨ Features

- **PWA Generator** — Paste a URL, get an installable Progressive Web App
- **APK Export** — Generate downloadable Android APKs from any PWA
- **AI Website Analyzer** — Intelligent analysis of websites with actionable suggestions
- **Templates Marketplace** — Pre-built app templates to get started fast
- **Admin Panel** — Full admin dashboard with role-based access control
- **SaaS Billing** — Stripe-powered subscription plans (Starter / Pro / Agency)
- **App Analytics** — Track installs, views, and engagement per app
- **Custom Domains** — Map your own domain to any published app
- **i18n** — Full internationalization support (English & Spanish)
- **Queue Architecture** — Background job processing with Upstash QStash
- **Security Hardened** — Rate limiting, bot detection, input validation, CSRF protection

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Database** | PostgreSQL (Neon recommended) |
| **ORM** | Prisma 6 |
| **Auth** | NextAuth.js v5 (Credentials) |
| **Payments** | Stripe (Subscriptions + Webhooks) |
| **Queue** | Upstash QStash |
| **i18n** | next-intl |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Deployment** | Vercel |

---

## 📁 Project Structure

```
├── prisma/                 # Database schema & migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed-templates.ts
├── public/                 # Static assets, PWA icons, service workers
├── messages/               # i18n translation files (en.json, es.json)
├── scripts/                # Seed scripts (admin, templates)
├── src/
│   ├── app/
│   │   ├── [locale]/       # Locale-aware pages
│   │   │   ├── (dashboard)/  # Authenticated dashboard pages
│   │   │   ├── (marketing)/  # Login, signup pages
│   │   │   ├── admin/        # Admin panel pages
│   │   │   └── templates/    # Templates marketplace
│   │   ├── api/            # API routes
│   │   │   ├── admin/      # Admin endpoints
│   │   │   ├── analytics/  # Analytics tracking
│   │   │   ├── apps/       # App CRUD & publishing
│   │   │   ├── auth/       # Auth endpoints
│   │   │   ├── generate/   # App generation
│   │   │   ├── jobs/       # Background job handlers
│   │   │   ├── stripe/     # Billing webhooks
│   │   │   └── templates/  # Template endpoints
│   │   ├── app/            # Public app rendering (slug & domain)
│   │   └── pwa/            # Dynamic manifest & service worker
│   ├── components/         # Reusable UI components
│   ├── config/             # Brand configuration
│   ├── i18n/               # Internationalization config
│   ├── lib/                # Shared utilities & services
│   └── types/              # TypeScript type declarations
├── docs/                   # Architecture documentation
├── vercel.json             # Vercel deployment config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.18
- **PostgreSQL** (local or [Neon](https://neon.tech) for cloud)
- **Stripe** account (for billing features)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/appnexu.git
cd appnexu
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# Required
AUTH_SECRET="generate-with: openssl rand -base64 32"
DATABASE_URL="postgresql://user:pass@localhost:5432/anyapp_dev"

# Optional (for billing)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Set Up Database

```bash
# Run migrations
npx prisma migrate deploy

# Seed templates (optional)
npx tsx prisma/seed-templates.ts

# Seed admin user (optional)
npx tsx scripts/seed-admin.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | ✅ | NextAuth.js secret key |
| `AUTH_TRUST_HOST` | ✅ | Set to `true` for Vercel |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | ❌ | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | ❌ | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | ❌ | Stripe price ID for Pro plan |
| `STRIPE_AGENCY_PRICE_ID` | ❌ | Stripe price ID for Agency plan |
| `NEXT_PUBLIC_APP_DOMAIN` | ❌ | Your production domain |
| `QSTASH_TOKEN` | ❌ | Upstash QStash token (prod queue) |
| `QSTASH_CURRENT_SIGNING_KEY` | ❌ | QStash signing key |
| `QSTASH_NEXT_SIGNING_KEY` | ❌ | QStash next signing key |
| `JOB_SECRET` | ❌ | Secret for inline job auth (dev) |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (runs `prisma generate` first) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema changes (dev) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database |

---

## 🚢 Deploying to Vercel

### 1. Push to GitHub

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/appnexu.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure environment variables (see table above)
4. Set **Build Command**: `npm run build`
5. Set **Install Command**: `npm install`
6. Deploy!

### 3. Post-Deploy Setup

```bash
# Run database migrations on your production database
npx prisma migrate deploy

# Seed templates
npx tsx prisma/seed-templates.ts
```

### 4. Stripe Webhook

1. In Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://your-domain.com/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 📚 Documentation

- [SaaS Implementation](./SAAS_IMPLEMENTATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Queue Architecture](./docs/QUEUE_ARCHITECTURE.md)
- [Templates System](./TEMPLATES_SYSTEM.md)
- [AI Analyzer](./AI_ANALYZER.md)
- [APK Export](./APK_EXPORT.md)
- [Production Checklist](./PRODUCTION_CHECKLIST.md)

---

## 📄 License

This project is proprietary and unlicensed for public distribution.

---

<p align="center">
  Built with ❤️ by <strong>Appnexu</strong>
</p>
force rebuild