import { NextResponse } from 'next/server';

/**
 * Debug endpoint to verify environment variables and configuration.
 * 
 * IMPORTANT: Remove or protect this endpoint before going to production!
 * Access: GET /api/debug
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
  const hasWhitespace = dbUrl !== dbUrl.trim();
  const hasNewlines = dbUrl.includes('\n') || dbUrl.includes('\r');

  const checks = {
    timestamp: new Date().toISOString(),
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ? `set (${process.env.AUTH_SECRET.length} chars)` : 'MISSING ❌',
      AUTH_URL: process.env.AUTH_URL || 'NOT SET ⚠️',
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET (Auth.js v5 uses AUTH_URL instead)',
      DATABASE_URL: dbUrl ? `set (${dbUrl.length} chars)` : 'MISSING ❌',
      DATABASE_URL_HAS_WHITESPACE: hasWhitespace ? '⚠️ YES - FIX THIS IN VERCEL ENV VARS!' : 'No ✅',
      DATABASE_URL_HAS_NEWLINES: hasNewlines ? '⚠️ YES - FIX THIS IN VERCEL ENV VARS!' : 'No ✅',
      DIRECT_URL: process.env.DIRECT_URL ? 'set' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
    notes: [
      'Auth.js v5 reads AUTH_SECRET (not NEXTAUTH_SECRET)',
      'Auth.js v5 reads AUTH_URL (not NEXTAUTH_URL)',
      'AUTH_TRUST_HOST=true is needed for Vercel deployments',
      hasWhitespace ? '🚨 CRITICAL: DATABASE_URL has whitespace! Edit it in Vercel and remove extra spaces/newlines.' : '',
    ].filter(Boolean),
  };

  // Test database connection
  try {
    const { prisma } = await import('@/lib/prisma');
    const userCount = await prisma.user.count();
    (checks as any).database = {
      status: 'connected ✅',
      userCount,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    (checks as any).database = {
      status: 'FAILED ❌',
      error: errMsg,
      hint: hasWhitespace ? 'DATABASE_URL has whitespace - this is likely the cause!' : '',
    };
  }

  return NextResponse.json(checks, { status: 200 });
}
