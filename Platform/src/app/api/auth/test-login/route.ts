import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/test-login
 * 
 * Debug endpoint that tests credential validation WITHOUT going through NextAuth.
 * This isolates whether the problem is:
 * 1. Database connectivity
 * 2. Password hash mismatch  
 * 3. NextAuth configuration
 * 4. Browser/extension issue
 * 
 * IMPORTANT: Remove or protect this endpoint before going to production!
 * 
 * Usage:
 *   curl -X POST https://appnexu.com/api/auth/test-login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"admin@appnexu.com","password":"Admin123!"}'
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    endpoint: '/api/auth/test-login',
    purpose: 'Validates credentials WITHOUT NextAuth - isolates auth vs browser issues',
  };

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({
        ...results,
        error: 'Missing email or password in request body',
        usage: 'POST with {"email": "...", "password": "..."}',
      }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    results.input = { email: normalizedEmail, passwordLength: password.length };

    // Step 1: Test database connection
    let prisma;
    try {
      const prismaModule = await import('@/lib/prisma');
      prisma = prismaModule.prisma;
      const count = await prisma.user.count();
      results.step1_database = { status: '✅ Connected', userCount: count };
    } catch (dbError) {
      results.step1_database = {
        status: '❌ FAILED',
        error: dbError instanceof Error ? dbError.message : String(dbError),
        diagnosis: 'Database is unreachable. Check DATABASE_URL in Vercel env vars.',
      };
      return NextResponse.json({ ...results, finalResult: 'BLOCKED - Database unavailable' }, { status: 503 });
    }

    // Step 2: Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    if (!user) {
      results.step2_userLookup = {
        status: '❌ NOT FOUND',
        diagnosis: `No user exists with email "${normalizedEmail}". Create one via /api/auth/setup or SQL.`,
      };
      return NextResponse.json({ ...results, finalResult: 'FAILED - User not found' }, { status: 404 });
    }

    results.step2_userLookup = {
      status: '✅ Found',
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      hasPassword: !!user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (!user.password) {
      results.step3_passwordCheck = {
        status: '❌ NO PASSWORD SET',
        diagnosis: 'User exists but has no password hash. Reset via /api/auth/setup or SQL.',
      };
      return NextResponse.json({ ...results, finalResult: 'FAILED - No password set' }, { status: 401 });
    }

    // Step 3: Validate password
    results.step3_passwordCheck = {
      hashAlgorithm: user.password.substring(0, 4),
      hashRounds: user.password.substring(4, 7),
      hashLength: user.password.length,
      expectedFormat: '$2b$12$ (bcrypt, 12 rounds, 60 chars)',
      formatValid: user.password.length === 60 && user.password.startsWith('$2'),
    };

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    results.step3_passwordCheck = {
      ...results.step3_passwordCheck as object,
      passwordMatch: passwordMatch ? '✅ YES - Password is correct!' : '❌ NO - Wrong password or corrupted hash',
    };

    if (!passwordMatch) {
      // Generate a fresh hash so the user can update it
      const freshHash = await bcrypt.hash(password, 12);
      results.step3_passwordCheck = {
        ...results.step3_passwordCheck as object,
        diagnosis: 'The password provided does not match the stored hash. Possible causes: (1) Wrong password, (2) Hash was corrupted during storage, (3) Hash was generated with different salt/encoding.',
        fixSQL: `UPDATE "User" SET "password" = '${freshHash}', "updatedAt" = NOW() WHERE "email" = '${normalizedEmail}';`,
        fixDescription: 'Run this SQL in Supabase SQL Editor to reset the password to the one you just provided.',
      };
      return NextResponse.json({
        ...results,
        finalResult: 'FAILED - Password mismatch',
        duration: `${Date.now() - startTime}ms`,
      }, { status: 401 });
    }

    // Step 4: Simulate what NextAuth would return
    const simulatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    results.step4_nextauthSimulation = {
      status: '✅ Would succeed',
      returnedUser: simulatedUser,
      explanation: 'If this test passes but actual login fails, the issue is in NextAuth config or browser extensions.',
    };

    // Step 5: Check NextAuth config
    results.step5_nextauthConfig = {
      AUTH_SECRET: process.env.AUTH_SECRET ? `✅ Set (${process.env.AUTH_SECRET.length} chars)` : '❌ MISSING',
      AUTH_URL: process.env.AUTH_URL || '⚠️ NOT SET (uses request host)',
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || '⚠️ NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token' 
        : 'authjs.session-token',
    };

    // Final diagnosis
    results.finalResult = '✅ CREDENTIALS VALID - Login should work';
    results.duration = `${Date.now() - startTime}ms`;
    results.browserAdvice = {
      extensionError: 'The error "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received" is caused by browser extensions (LastPass, Grammarly, ad blockers, etc.)',
      howToVerify: [
        '1. Open Chrome/Edge in Incognito/Private mode (extensions disabled by default)',
        '2. Go to appnexu.com/login',
        '3. Try to log in',
        '4. If it works → an extension is causing the error',
        '5. Disable extensions one by one to find the culprit',
      ],
      commonCulprits: ['LastPass', 'Bitwarden', 'Grammarly', 'uBlock Origin', 'Ghostery', 'Privacy Badger'],
    };

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    results.unexpectedError = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
    };
    return NextResponse.json({
      ...results,
      finalResult: 'ERROR - Unexpected server error',
      duration: `${Date.now() - startTime}ms`,
    }, { status: 500 });
  }
}

/**
 * GET /api/auth/test-login
 * Shows usage instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/auth/test-login',
    method: 'POST',
    description: 'Tests credential validation WITHOUT NextAuth to isolate login issues',
    usage: {
      curl: 'curl -X POST https://appnexu.com/api/auth/test-login -H "Content-Type: application/json" -d \'{"email":"admin@appnexu.com","password":"Admin123!"}\'',
      body: { email: 'string', password: 'string' },
    },
    note: 'Remove this endpoint before going to production!',
  });
}
