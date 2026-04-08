import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { STRIPE_PRICE_IDS } from '@/lib/stripe';

/**
 * GET /api/stripe/config — Returns stripe configuration status for the settings page.
 * Used by UpgradeButton to pre-check if Stripe is configured before showing error.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    proPriceConfigured: !!STRIPE_PRICE_IDS.PRO,
    agencyPriceConfigured: !!STRIPE_PRICE_IDS.AGENCY,
  });
}
