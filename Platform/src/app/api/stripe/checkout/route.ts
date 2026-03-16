import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { checkoutSchema, formatZodErrors } from '@/lib/validations';
import { apiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    if (!stripe) {
      logger.warn('stripe.checkout', 'Stripe not configured');
      return apiError('Billing is not configured. Please contact support.', 503, 'STRIPE_NOT_CONFIGURED');
    }

    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

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

    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      logger.error('stripe.checkout', `Price ID not configured for ${plan}`);
      return apiError(`Price configuration missing for ${plan} plan. Please contact support.`, 500, 'PRICE_NOT_CONFIGURED');
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return apiError('User not found', 404, 'NOT_FOUND');
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
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
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/en/settings?upgrade=success&plan=${plan}`,
      cancel_url: `${baseUrl}/en/settings?upgrade=cancelled`,
      metadata: { userId: user.id, plan },
    });

    logger.info('stripe.checkout', 'Checkout session created', { userId: user.id, plan });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    logger.error('stripe.checkout', 'Checkout failed', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to create checkout session', 500, 'INTERNAL_ERROR');
  }
}
