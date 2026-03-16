/**
 * POST /api/analytics/track
 *
 * Public endpoint to track analytics events for published apps.
 * Implements bot detection, rate limiting, and privacy-conscious tracking.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackEvent } from '@/lib/analytics';
import { isBot, getDeviceType, getBrowserType, createVisitorHash } from '@/lib/bot-detection';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Rate limiting: 60 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`analytics:${clientIp}`, { max: 60, windowSec: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Bot detection
    if (isBot(request)) {
      // Silently accept but don't track
      return NextResponse.json({ success: true });
    }

    // Parse body
    const body = await request.json().catch(() => null);
    if (!body || !body.appId || !body.eventType) {
      return NextResponse.json({ error: 'Missing required fields: appId, eventType' }, { status: 400 });
    }

    const { appId, eventType } = body;

    // Validate event type
    const validEventTypes = ['PAGE_VIEW', 'INSTALL_CLICK', 'PUBLISHED', 'UNIQUE_VISIT'];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Verify app exists and is published (only track published apps)
    const app = await prisma.appProject.findUnique({
      where: { id: appId },
      select: { id: true, status: true },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Only track published apps (except PUBLISHED event itself)
    if (app.status !== 'PUBLISHED' && eventType !== 'PUBLISHED') {
      return NextResponse.json({ success: true }); // Silent accept
    }

    // Build metadata
    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || body.referrer || '';
    const visitorHash = createVisitorHash(clientIp, userAgent);

    let referrerHost = 'direct';
    if (referrer) {
      try {
        referrerHost = new URL(referrer).hostname;
      } catch {
        referrerHost = 'unknown';
      }
    }

    const metadata: Record<string, unknown> = {
      referrer: referrerHost,
      deviceType: getDeviceType(userAgent),
      browser: getBrowserType(userAgent),
      visitorHash,
    };

    // Track the event
    await trackEvent({
      appId,
      eventType: eventType as 'PAGE_VIEW' | 'INSTALL_CLICK' | 'PUBLISHED' | 'UNIQUE_VISIT',
      metadata,
      visitorHash,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('analytics-track', 'Failed to track event', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    // Always return success to not affect user experience
    return NextResponse.json({ success: true });
  }
}
