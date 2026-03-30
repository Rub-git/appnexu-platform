import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs'; // se queda, pero simplificamos uso
import { registerSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // Rate limit: 5 registrations per IP per 60s
    const ip = getClientIp(request);
    const rl = checkRateLimit(`register:${ip}`, { max: 5, windowSec: 60 });
    if (!rl.allowed) {
      logger.warn('auth.register', 'Rate limited', { ip });
      return apiError('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return apiError('An account with this email already exists', 400, 'EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

    logger.info('auth.register', 'User registered', { userId: user.id, email: user.email });

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }, 201);
 catch (error) {
  console.error("REGISTER ERROR FULL:", error);

  logger.error('auth.register', 'Registration failed', { 
    error: error instanceof Error ? error.message : 'Unknown' 
  });

  return apiError(
    error instanceof Error ? error.message : 'Failed to create account',
    500,
    'INTERNAL_ERROR'
  );
}
