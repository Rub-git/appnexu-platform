import { NextResponse } from 'next/server';

/**
 * Debug endpoint to verify environment variables and configuration.
 * 
 * IMPORTANT: Remove or protect this endpoint before going to production!
 * Access: GET /api/debug
 */
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ? `set (${process.env.AUTH_SECRET.length} chars)` : 'MISSING ❌',
      AUTH_URL: process.env.AUTH_URL || 'NOT SET ⚠️',
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET (Auth.js v5 uses AUTH_URL instead)',
      DATABASE_URL: process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.substring(0, 20)}...)` : 'MISSING ❌',
      NODE_ENV: process.env.NODE_ENV,
    },
    notes: [
      'Auth.js v5 reads AUTH_SECRET (not NEXTAUTH_SECRET)',
      'Auth.js v5 reads AUTH_URL (not NEXTAUTH_URL)',
      'AUTH_TRUST_HOST=true is needed for Vercel deployments',
      'If AUTH_URL is NOT SET, set it to your production URL (e.g., https://www.appnexu.com)',
    ],
  };

  // Test database connection
  try {
    const { prisma } = await import('@/lib/prisma');
    const userCount = await prisma.user.count();
    (checks as any).database = {
      status: 'connected ✅',
      userCount,
    };
  } catch (error: any) {
    (checks as any).database = {
      status: 'FAILED ❌',
      error: error.message,
    };
  }

  return NextResponse.json(checks, { status: 200 });
}
