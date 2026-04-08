import "server-only";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set. Stripe features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Let the SDK use its own default API version for maximum compatibility
      typescript: true,
    })
  : null;

// Price IDs for each plan upgrade
// Configure these in your Stripe Dashboard and set as environment variables
export const STRIPE_PRICE_IDS = {
  PRO: process.env.STRIPE_PRO_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
  AGENCY: process.env.STRIPE_AGENCY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID || '',
} as const;

// Map Stripe price IDs back to plans
export function getPlanFromPriceId(priceId: string): 'PRO' | 'AGENCY' | null {
  if (priceId === STRIPE_PRICE_IDS.PRO) return 'PRO';
  if (priceId === STRIPE_PRICE_IDS.AGENCY) return 'AGENCY';
  return null;
}

/**
 * Detect whether the Stripe secret key is in test or live mode.
 */
export function getStripeMode(): 'test' | 'live' | 'unknown' {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  return 'unknown';
}
