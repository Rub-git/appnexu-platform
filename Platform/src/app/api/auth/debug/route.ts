import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

/**
 * Debug endpoint to diagnose authentication issues.
 * 
 * IMPORTANT: Remove or protect this endpoint before going to production!
 * Access: GET /api/auth/debug
 * 
 * Checks:
 * 1. Database connectivity
 * 2. Admin user existence
 * 3. Password hash validation
 * 4. Environment variable status
 * 5. DATABASE_URL whitespace issues
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // 1. Check environment variables
  const dbUrl = process.env.DATABASE_URL || '';
  const dbUrlTrimmed = dbUrl.trim();
  const hasWhitespace = dbUrl !== dbUrlTrimmed;
  const hasNewlines = dbUrl.includes('\n') || dbUrl.includes('\r');

  results.env = {
    AUTH_SECRET: process.env.AUTH_SECRET ? `set (${process.env.AUTH_SECRET.length} chars)` : 'MISSING ❌',
    AUTH_URL: process.env.AUTH_URL || 'NOT SET',
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || 'NOT SET',
    DATABASE_URL: dbUrl ? `set (${dbUrl.length} chars)` : 'MISSING ❌',
    DATABASE_URL_HAS_WHITESPACE: hasWhitespace ? '⚠️ YES - This will break DB connections!' : 'No ✅',
    DATABASE_URL_HAS_NEWLINES: hasNewlines ? '⚠️ YES - This will break DB connections!' : 'No ✅',
    DATABASE_URL_HOST: dbUrl ? extractHost(dbUrl) : 'N/A',
    DIRECT_URL: process.env.DIRECT_URL ? 'set' : 'NOT SET (OK if not using pgBouncer split)',
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. Test database connection
  try {
    const { prisma } = await import('@/lib/prisma');
    const userCount = await prisma.user.count();
    results.database = {
      status: 'connected ✅',
      userCount,
    };

    // 3. Check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@appnexu.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (adminUser) {
      // 4. Test password hash
      const testPassword = 'Admin123!';
      const hashValid = adminUser.password
        ? await bcrypt.compare(testPassword, adminUser.password)
        : false;

      // Generate a known-good hash for comparison
      const freshHash = await bcrypt.hash(testPassword, 12);

      results.adminUser = {
        exists: true,
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        plan: adminUser.plan,
        hasPassword: !!adminUser.password,
        passwordHashPrefix: adminUser.password?.substring(0, 7) || 'none',
        passwordHashLength: adminUser.password?.length || 0,
        passwordMatchesAdmin123: hashValid ? '✅ YES' : '❌ NO - Password hash does NOT match "Admin123!"',
        freshBcryptHash: freshHash,
        createdAt: adminUser.createdAt,
        updatedAt: adminUser.updatedAt,
      };
    } else {
      results.adminUser = {
        exists: false,
        message: '❌ No user found with email admin@appnexu.com',
      };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    results.database = {
      status: 'FAILED ❌',
      error: errMsg,
      hint: hasWhitespace
        ? 'DATABASE_URL has leading/trailing whitespace! Fix it in Vercel Environment Variables.'
        : 'Check DATABASE_URL format and ensure the database server is accessible.',
    };
  }

  // 5. Diagnosis summary
  const issues: string[] = [];
  if (hasWhitespace) issues.push('DATABASE_URL has whitespace - trim it in Vercel env vars');
  if (hasNewlines) issues.push('DATABASE_URL has newline characters - remove them in Vercel env vars');
  if (!process.env.AUTH_SECRET) issues.push('AUTH_SECRET is missing');
  if (process.env.DIRECT_URL === undefined && process.env.NODE_ENV === 'production') {
    issues.push('DIRECT_URL not set - if schema.prisma references it, Prisma build will fail');
  }

  results.diagnosis = {
    issuesFound: issues.length,
    issues: issues.length > 0 ? issues : ['No obvious issues detected'],
    recommendations: [
      'In Vercel → Project Settings → Environment Variables:',
      '1. Edit DATABASE_URL and remove any leading/trailing whitespace or newlines',
      '2. Either set DIRECT_URL or remove directUrl from prisma/schema.prisma',
      '3. Ensure AUTH_SECRET is set (32+ chars)',
      '4. Redeploy after fixing env vars',
    ],
  };

  return NextResponse.json(results, { status: 200 });
}

function extractHost(url: string): string {
  try {
    const match = url.match(/@([^:\/]+)/);
    return match ? match[1] : 'could not parse';
  } catch {
    return 'parse error';
  }
}
