import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

function getEmailFromIdentifier(identifier: string): string | null {
  if (!identifier.startsWith('password-reset:')) {
    return null;
  }
  return identifier.replace('password-reset:', '');
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipRate = checkRateLimit(`password-reset:confirm:ip:${ip}`, { max: 10, windowSec: 300 });
    if (!ipRate.allowed) {
      return apiError('Too many attempts. Please try again in a few minutes.', 429, 'RATE_LIMITED');
    }

    const body = await request.json().catch(() => null);
    const token = (body?.token as string | undefined)?.trim();
    const password = body?.password as string | undefined;

    if (!token) {
      return apiError('Reset token is required', 400, 'MISSING_TOKEN');
    }

    // Throttle repeated attempts against the same token fingerprint.
    const tokenFingerprint = crypto.createHash('sha256').update(token).digest('hex').slice(0, 24);
    const tokenRate = checkRateLimit(`password-reset:confirm:token:${tokenFingerprint}`, { max: 5, windowSec: 300 });
    if (!tokenRate.allowed) {
      return apiError('Too many attempts. Please request a new reset link.', 429, 'TOKEN_RATE_LIMITED');
    }

    if (!password || password.length < 8) {
      return apiError('Password must be at least 8 characters', 400, 'INVALID_PASSWORD');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const savedToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!savedToken || savedToken.expires.getTime() < Date.now()) {
      return apiError('Reset link expired or invalid', 400, 'INVALID_OR_EXPIRED_TOKEN');
    }

    const email = getEmailFromIdentifier(savedToken.identifier);
    if (!email) {
      return apiError('Reset link expired or invalid', 400, 'INVALID_OR_EXPIRED_TOKEN');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: savedToken.identifier,
          token: savedToken.token,
        },
      },
    });

    logger.info('auth.password-reset', 'Password updated via reset flow', {
      email,
    });

    return apiSuccess({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('auth.password-reset', 'Failed to confirm password reset', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return apiError('Failed to reset password', 500, 'INTERNAL_ERROR');
  }
}
