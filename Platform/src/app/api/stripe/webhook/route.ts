import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

// Disable body parsing for webhook - we need the raw body
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!stripe) {
      logger.warn('stripe.webhook', 'Stripe not configured');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('stripe.webhook', 'Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('stripe.webhook', 'STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logger.warn('stripe.webhook', 'Signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    logger.info('stripe.webhook', `Processing event: ${event.type}`, { eventId: event.id });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        logger.info('stripe.webhook', `Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('stripe.webhook', 'Webhook handler failed', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    // Return 200 to prevent Stripe retries on application errors
    // Stripe will retry on 5xx but not 2xx
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    logger.error('stripe.webhook', 'Missing metadata in checkout session', { sessionId: session.id });
    return;
  }

  if (!['PRO', 'AGENCY'].includes(plan)) {
    logger.error('stripe.webhook', 'Invalid plan in checkout metadata', { plan, sessionId: session.id });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: plan as 'PRO' | 'AGENCY',
      stripeCustomerId: session.customer as string,
    },
  });

  logger.info('stripe.webhook', `User upgraded to ${plan}`, { userId, plan });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error('stripe.webhook', 'User not found for subscription update', { customerId });
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    logger.warn('stripe.webhook', 'No price ID in subscription', { customerId });
    return;
  }

  const plan = getPlanFromPriceId(priceId);
  if (!plan) {
    logger.warn('stripe.webhook', 'Unknown price ID', { priceId, customerId });
    return;
  }

  // Only update if subscription is active
  if (subscription.status === 'active') {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan },
    });
    logger.info('stripe.webhook', `Subscription updated: ${plan}`, { userId: user.id, plan });
  } else {
    logger.info('stripe.webhook', `Subscription status: ${subscription.status}, not updating plan`, {
      userId: user.id,
      status: subscription.status,
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error('stripe.webhook', 'User not found for subscription deletion', { customerId });
    return;
  }

  // Downgrade to FREE — do NOT delete user apps
  // Existing apps are preserved; user just can't create new ones above limit
  await prisma.user.update({
    where: { id: user.id },
    data: { plan: 'FREE' },
  });

  logger.info('stripe.webhook', 'User downgraded to FREE (subscription cancelled)', {
    userId: user.id,
    previousPlan: user.plan,
  });
}
