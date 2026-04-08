import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { checkoutSchema, formatZodErrors } from '@/lib/validations';
import { apiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    // ─── 1. Stripe availability ──────────────────────────────────────
    if (!stripe) {
      const hasKey = !!process.env.STRIPE_SECRET_KEY;
      logger.error('stripe.checkout', 'Stripe client not initialized', {
        hasSecretKey: hasKey,
        hint: hasKey
          ? 'Key exists but Stripe client failed to initialise – check key format'
          : 'STRIPE_SECRET_KEY environment variable is missing',
      });
      return apiError(
        'Billing is not configured. Please contact support.',
        503,
        'STRIPE_NOT_CONFIGURED',
      );
    }

    // ─── 2. Authentication ───────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // ─── 3. Parse body ──────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
    }

    const { plan } = parsed.data;

    // ─── 4. Price ID lookup ─────────────────────────────────────────
    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      logger.error('stripe.checkout', `Price ID not configured for ${plan}`, {
        envVar: plan === 'PRO' ? 'STRIPE_PRO_PRICE_ID' : 'STRIPE_AGENCY_PRICE_ID',
        resolvedValue: priceId,
        allPriceIds: {
          PRO: STRIPE_PRICE_IDS.PRO ? `${STRIPE_PRICE_IDS.PRO.slice(0, 12)}...` : 'EMPTY',
          AGENCY: STRIPE_PRICE_IDS.AGENCY ? `${STRIPE_PRICE_IDS.AGENCY.slice(0, 12)}...` : 'EMPTY',
        },
      });
      return apiError(
        `Price configuration missing for ${plan} plan. Please contact support.`,
        500,
        'PRICE_NOT_CONFIGURED',
      );
    }

    // ─── 5. Detect test/live mode mismatch ──────────────────────────
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const keyIsTest = secretKey.startsWith('sk_test_');
    const keyIsLive = secretKey.startsWith('sk_live_');
    const priceIsTest = priceId.startsWith('price_') && priceId.includes('_test_');
    // Live price IDs do NOT contain "_test_" – they just start with "price_"
    // We can only detect definite test prices; all others are assumed live/compatible

    if (keyIsTest && priceIsTest === false && keyIsLive === false) {
      // We are in test mode but we can't be 100% sure the price is live
      // (Stripe test prices don't always contain "_test_").
      // Just log a warning; the actual Stripe call will fail clearly.
      logger.warn('stripe.checkout', 'Possible test/live mismatch', {
        keyMode: keyIsTest ? 'test' : keyIsLive ? 'live' : 'unknown',
        priceIdPrefix: priceId.slice(0, 20),
      });
    }

    // ─── 6. Get or create Stripe customer ───────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return apiError('User not found', 404, 'NOT_FOUND');
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;

        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });

        logger.info('stripe.checkout', 'Created Stripe customer', {
          userId: user.id,
          customerId,
        });
      } catch (custErr) {
        const msg = custErr instanceof Error ? custErr.message : String(custErr);
        logger.error('stripe.checkout', 'Failed to create Stripe customer', {
          userId: user.id,
          error: msg,
          stripeCode: custErr instanceof Stripe.errors.StripeError ? custErr.code : undefined,
          stripeType: custErr instanceof Stripe.errors.StripeError ? custErr.type : undefined,
        });
        return apiError(
          'Failed to set up billing account. Please try again or contact support.',
          502,
          'STRIPE_CUSTOMER_ERROR',
          process.env.NODE_ENV !== 'production' ? { detail: msg } : undefined,
        );
      }
    }

    // ─── 7. Create Checkout Session ─────────────────────────────────
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/es/settings?upgrade=success&plan=${plan}`,
        cancel_url: `${baseUrl}/es/settings?upgrade=cancelled`,
        metadata: { userId: user.id, plan },
      });

      logger.info('stripe.checkout', 'Checkout session created', {
        userId: user.id,
        plan,
        sessionId: checkoutSession.id,
      });

      return NextResponse.json({
        url: checkoutSession.url,
        sessionId: checkoutSession.id,
      });
    } catch (stripeErr) {
      // ── Detailed Stripe error handling ──
      const isStripeError = stripeErr instanceof Stripe.errors.StripeError;
      const errMsg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      const stripeCode = isStripeError ? stripeErr.code : undefined;
      const stripeType = isStripeError ? stripeErr.type : undefined;
      const httpStatus = isStripeError ? stripeErr.statusCode : undefined;

      logger.error('stripe.checkout', 'Stripe checkout.sessions.create failed', {
        userId: user.id,
        plan,
        priceId: priceId.slice(0, 20) + '...',
        error: errMsg,
        stripeCode,
        stripeType,
        httpStatus,
      });

      // Provide user-friendly messages based on Stripe error type
      let userMessage = 'Failed to create checkout session. Please try again.';
      let errorCode = 'STRIPE_CHECKOUT_ERROR';

      if (stripeType === 'StripeInvalidRequestError') {
        if (errMsg.includes('No such price')) {
          userMessage = `The price for the ${plan} plan is invalid or doesn't exist in the current Stripe mode. Please contact support.`;
          errorCode = 'INVALID_PRICE_ID';
        } else if (errMsg.includes('No such customer')) {
          // Customer was deleted on Stripe side – clear it and ask to retry
          userMessage = 'Billing account needs to be re-created. Please try again.';
          errorCode = 'CUSTOMER_NOT_FOUND';
          // Clear stale customer ID
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: null },
          }).catch(() => {});
        } else {
          userMessage = `Stripe configuration error. Please contact support.`;
          errorCode = 'STRIPE_CONFIG_ERROR';
        }
      } else if (stripeType === 'StripeAuthenticationError') {
        userMessage = 'Stripe authentication failed. The API key may be invalid.';
        errorCode = 'STRIPE_AUTH_ERROR';
      } else if (stripeType === 'StripeAPIError') {
        userMessage = 'Stripe is temporarily unavailable. Please try again in a few minutes.';
        errorCode = 'STRIPE_API_ERROR';
      }

      return apiError(
        userMessage,
        httpStatus || 500,
        errorCode,
        process.env.NODE_ENV !== 'production'
          ? { stripeMessage: errMsg, stripeCode, stripeType }
          : undefined,
      );
    }
  } catch (error) {
    // ── Unexpected / non-Stripe errors ──
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined;

    logger.error('stripe.checkout', 'Unexpected checkout error', {
      error: errMsg,
      stack: errStack,
    });

    return apiError(
      'An unexpected error occurred. Please try again.',
      500,
      'INTERNAL_ERROR',
      process.env.NODE_ENV !== 'production' ? { detail: errMsg } : undefined,
    );
  }
}
