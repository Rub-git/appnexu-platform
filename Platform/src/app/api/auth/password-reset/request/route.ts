import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

function getBaseUrl(request: Request): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return appUrl.replace(/\/+$/, '');
  }

  const origin = request.headers.get('origin')?.trim();
  if (origin) {
    return origin.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipRate = checkRateLimit(`password-reset:request:ip:${ip}`, { max: 5, windowSec: 300 });
    if (!ipRate.allowed) {
      return apiError('Too many reset requests. Please try again in a few minutes.', 429, 'RATE_LIMITED');
    }

    const body = await request.json().catch(() => null);
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    const locale = (body?.locale as string | undefined) === 'es' ? 'es' : 'en';

    if (!email || !email.includes('@')) {
      return apiError('A valid email is required', 400, 'INVALID_EMAIL');
    }

    const emailRate = checkRateLimit(`password-reset:request:email:${email}`, { max: 3, windowSec: 600 });
    if (!emailRate.allowed) {
      return apiSuccess({
        message: 'If the email exists, password reset instructions were sent.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Do not reveal if an email exists in the system.
    if (!user) {
      return apiSuccess({
        message: 'If the email exists, password reset instructions were sent.',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const identifier = `password-reset:${email}`;
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: hashedToken,
        expires,
      },
    });

    const baseUrl = getBaseUrl(request);
    const resetUrl = `${baseUrl}/${locale}/reset-password?token=${rawToken}`;

    logger.info('auth.password-reset', 'Reset token generated', {
      email,
      expiresAt: expires.toISOString(),
      mode: process.env.NODE_ENV,
    });

    if (process.env.NODE_ENV !== 'production') {
      return apiSuccess({
        message: 'Password reset link generated for local development.',
        resetUrl,
      });
    }

    return apiSuccess({
      message: 'If the email exists, password reset instructions were sent.',
    });
  } catch (error) {
    logger.error('auth.password-reset', 'Failed to request password reset', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Failed to process password reset request' }, { status: 500 });
  }
}
