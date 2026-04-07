import { NextResponse } from 'next/server';

/**
 * GET /api/stripe/debug — Public endpoint to check Stripe env var configuration.
 * Does NOT expose any secret values, only shows if variables are present.
 * 
 * REMOVE OR PROTECT THIS IN PRODUCTION after debugging.
 */
export async function GET() {
  const envVars = {
    STRIPE_SECRET_KEY: {
      set: !!process.env.STRIPE_SECRET_KEY,
      preview: process.env.STRIPE_SECRET_KEY
        ? `${process.env.STRIPE_SECRET_KEY.slice(0, 7)}...${process.env.STRIPE_SECRET_KEY.slice(-4)}`
        : '❌ NOT SET',
    },
    STRIPE_PRO_PRICE_ID: {
      set: !!process.env.STRIPE_PRO_PRICE_ID,
      value: process.env.STRIPE_PRO_PRICE_ID || '❌ NOT SET',
      length: process.env.STRIPE_PRO_PRICE_ID?.length || 0,
    },
    STRIPE_AGENCY_PRICE_ID: {
      set: !!process.env.STRIPE_AGENCY_PRICE_ID,
      value: process.env.STRIPE_AGENCY_PRICE_ID || '❌ NOT SET',
      length: process.env.STRIPE_AGENCY_PRICE_ID?.length || 0,
    },
    STRIPE_WEBHOOK_SECRET: {
      set: !!process.env.STRIPE_WEBHOOK_SECRET,
      preview: process.env.STRIPE_WEBHOOK_SECRET
        ? `${process.env.STRIPE_WEBHOOK_SECRET.slice(0, 8)}...`
        : '❌ NOT SET',
    },
  };

  // Also check what the resolved PRICE_IDS object looks like
  // We import dynamically to avoid server-only issues
  let resolvedPriceIds = { PRO: '', AGENCY: '' };
  try {
    const { STRIPE_PRICE_IDS } = await import('@/lib/stripe');
    resolvedPriceIds = { ...STRIPE_PRICE_IDS };
  } catch (e) {
    // If import fails, note it
  }

  const allConfigured = envVars.STRIPE_SECRET_KEY.set && 
    envVars.STRIPE_PRO_PRICE_ID.set && 
    envVars.STRIPE_AGENCY_PRICE_ID.set;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: allConfigured ? '✅ All Stripe variables configured' : '❌ Missing configuration',
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    env_vars: envVars,
    resolved_price_ids: resolvedPriceIds,
    diagnosis: {
      price_ids_empty: !resolvedPriceIds.PRO || !resolvedPriceIds.AGENCY,
      note: !resolvedPriceIds.PRO || !resolvedPriceIds.AGENCY
        ? 'STRIPE_PRICE_IDS are empty strings. This means the env vars were NOT available when the module was loaded. Possible causes: (1) Variables not set in Vercel for the correct environment (Production vs Preview), (2) Variables contain extra whitespace or quotes, (3) Deployment was not triggered after adding variables.'
        : 'Price IDs are correctly loaded.',
    },
    required_variables: {
      STRIPE_SECRET_KEY: 'Your Stripe secret key (starts with sk_test_ or sk_live_)',
      STRIPE_PRO_PRICE_ID: 'Price ID for PRO plan from Stripe Dashboard (starts with price_)',
      STRIPE_AGENCY_PRICE_ID: 'Price ID for AGENCY plan from Stripe Dashboard (starts with price_)',
      STRIPE_WEBHOOK_SECRET: 'Webhook signing secret (starts with whsec_) — optional for checkout but needed for subscription updates',
    },
    troubleshooting: [
      '1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
      '2. Verify ALL these variables are set for "Production" environment (not just Preview)',
      '3. Make sure values do NOT have quotes around them (Vercel adds them automatically)',
      '4. Make sure there is no leading/trailing whitespace in the values',
      '5. After adding/changing variables, you MUST redeploy (Deployments → Redeploy)',
      '6. Price IDs look like: price_1ABC123def456 (from Stripe Dashboard → Products → Price ID)',
    ],
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
