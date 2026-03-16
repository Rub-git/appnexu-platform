import "server-only";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    })
  : null;

// Price IDs for each plan upgrade
// Configure these in your Stripe Dashboard
export const STRIPE_PRICE_IDS = {
  PRO: process.env.STRIPE_PRO_PRICE_ID || '',
  AGENCY: process.env.STRIPE_AGENCY_PRICE_ID || '',
} as const;

// Map Stripe price IDs back to plans
export function getPlanFromPriceId(priceId: string): 'PRO' | 'AGENCY' | null {
  if (priceId === STRIPE_PRICE_IDS.PRO) return 'PRO';
  if (priceId === STRIPE_PRICE_IDS.AGENCY) return 'AGENCY';
  return null;
}
