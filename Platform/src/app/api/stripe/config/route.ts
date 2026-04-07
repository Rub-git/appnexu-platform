import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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
    proPriceConfigured: !!process.env.STRIPE_PRO_PRICE_ID,
    agencyPriceConfigured: !!process.env.STRIPE_AGENCY_PRICE_ID,
  });
}
