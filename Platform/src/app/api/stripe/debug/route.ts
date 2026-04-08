import { NextResponse } from 'next/server';
import { stripe, STRIPE_PRICE_IDS, getStripeMode } from '@/lib/stripe';

/**
 * PUBLIC diagnostic endpoint for Stripe configuration.
 * ⚠️  Remove or protect in production after debugging.
 *
 * GET /api/stripe/debug
 */
export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const mode = getStripeMode();

  // Check if price IDs actually exist on Stripe
  const priceChecks: Record<string, unknown> = {};

  if (stripe) {
    for (const [plan, priceId] of Object.entries(STRIPE_PRICE_IDS)) {
      if (!priceId) {
        priceChecks[plan] = { status: 'NOT_SET', priceId: '' };
        continue;
      }
      try {
        const price = await stripe.prices.retrieve(priceId);
        priceChecks[plan] = {
          status: 'VALID',
          priceId: priceId.slice(0, 25) + '...',
          active: price.active,
          currency: price.currency,
          unitAmount: price.unit_amount,
          interval: price.recurring?.interval,
          productId: typeof price.product === 'string' ? price.product : (price.product as { id: string })?.id,
          livemode: price.livemode,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        priceChecks[plan] = {
          status: 'ERROR',
          priceId: priceId.slice(0, 25) + '...',
          error: msg,
          hint: msg.includes('No such price')
            ? `This price ID does not exist in ${mode} mode. You may have a test/live mismatch.`
            : undefined,
        };
      }
    }
  }

  const diagnosis: Record<string, unknown> = {};

  // Test/live mismatch detection
  if (stripe && priceChecks) {
    const hasErrors = Object.values(priceChecks).some(
      (c: unknown) => (c as Record<string, unknown>).status === 'ERROR',
    );
    if (hasErrors) {
      diagnosis.mismatch_warning =
        `Your STRIPE_SECRET_KEY is in ${mode} mode. ` +
        `Make sure your Price IDs were also created in ${mode} mode in Stripe Dashboard. ` +
        `Test-mode prices only work with test-mode keys, and vice versa.`;
    }
  }

  // Check env var source (NEXT_PUBLIC_ fallback)
  const proFromPublic = !process.env.STRIPE_PRO_PRICE_ID && !!process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
  const agencyFromPublic = !process.env.STRIPE_AGENCY_PRICE_ID && !!process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    stripe_initialized: !!stripe,
    stripe_mode: mode,
    environment: {
      STRIPE_SECRET_KEY: secretKey
        ? `${secretKey.slice(0, 8)}...${secretKey.slice(-4)} (${secretKey.length} chars)`
        : 'NOT SET',
      STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || 'NOT SET',
      STRIPE_AGENCY_PRICE_ID: process.env.STRIPE_AGENCY_PRICE_ID || 'NOT SET',
      NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'NOT SET',
      NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID || 'NOT SET',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'NOT SET',
    },
    resolved_price_ids: {
      PRO: STRIPE_PRICE_IDS.PRO || 'EMPTY',
      AGENCY: STRIPE_PRICE_IDS.AGENCY || 'EMPTY',
      pro_from_public_env: proFromPublic,
      agency_from_public_env: agencyFromPublic,
    },
    price_validation: priceChecks,
    diagnosis,
    auth_urls: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      AUTH_URL: process.env.AUTH_URL || 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    },
    instructions: {
      step1: 'Verify stripe_mode matches the mode where you created your products/prices',
      step2: 'Check price_validation – each plan should show status: VALID',
      step3: 'If you see "No such price" errors, your key mode and price mode are mismatched',
      step4: 'In Stripe Dashboard, toggle "Test mode" switch to match your key',
      fix_mismatch: 'Either switch your STRIPE_SECRET_KEY to match the price mode, or create new prices in the correct mode',
    },
  });
}
