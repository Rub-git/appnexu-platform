import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';

/**
 * GET /api/stripe/status — Admin-only Stripe configuration check.
 * Returns which Stripe env vars are configured and which are missing.
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = {
      stripe_configured: !!stripe,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_PUBLISHABLE_KEY: !!process.env.STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_PRO_PRICE_ID: {
        set: !!process.env.STRIPE_PRO_PRICE_ID,
        value_preview: process.env.STRIPE_PRO_PRICE_ID
          ? `${process.env.STRIPE_PRO_PRICE_ID.slice(0, 12)}...`
          : '❌ NOT SET — This causes the "Price configuration missing for PRO" error',
      },
      STRIPE_AGENCY_PRICE_ID: {
        set: !!process.env.STRIPE_AGENCY_PRICE_ID,
        value_preview: process.env.STRIPE_AGENCY_PRICE_ID
          ? `${process.env.STRIPE_AGENCY_PRICE_ID.slice(0, 12)}...`
          : '❌ NOT SET — This causes the "Price configuration missing for AGENCY" error',
      },
      resolved_price_ids: STRIPE_PRICE_IDS,
      instructions: !process.env.STRIPE_PRO_PRICE_ID || !process.env.STRIPE_AGENCY_PRICE_ID
        ? 'See STRIPE-SETUP.md for step-by-step instructions to fix this.'
        : 'All Stripe price IDs are configured ✅',
    };

    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
