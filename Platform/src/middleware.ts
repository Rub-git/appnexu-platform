import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/settings', '/admin'];

// Known platform hostnames (add your production domain here)
const PLATFORM_HOSTS = [
  'localhost',
  '127.0.0.1',
  process.env.NEXT_PUBLIC_APP_DOMAIN || '',
].filter(Boolean);

const CUSTOM_DOMAIN_ROOT_ASSETS = new Set([
  '/manifest.json',
  '/sw.js',
  '/launch',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/maskable-icon.png',
]);

function isPlatformHost(hostname: string): boolean {
  // Remove port from hostname
  const host = hostname.split(':')[0];
  return PLATFORM_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`) || host.endsWith('.vercel.app') || host.endsWith('.preview.abacusai.app')
  );
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';
  const hostNoPort = hostname.split(':')[0].toLowerCase();

  // Custom-domain routing: rewrite host-based app paths before locale/static handling.
  // Keep API/_next untouched and only rewrite selected static endpoints required by PWA.
  if (!isPlatformHost(hostname)) {
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return NextResponse.next();
    }

    const isWhitelistedStatic = CUSTOM_DOMAIN_ROOT_ASSETS.has(pathname);
    const isGenericStatic = pathname.includes('.') && !isWhitelistedStatic;
    if (isGenericStatic) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/app/_domain/${hostNoPort}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Skip middleware for API routes, static files, and PWA routes
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/pwa') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Apply i18n middleware first
  const response = intlMiddleware(request);

  // Extract locale from pathname
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es)/, '') || '/';

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathnameWithoutLocale.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check for session token cookie (NextAuth v5 uses authjs.session-token)
    const sessionToken = request.cookies.get('authjs.session-token')?.value ||
                         request.cookies.get('__Secure-authjs.session-token')?.value;
    
    if (!sessionToken) {
      // Get locale from pathname or default
      const locale = pathname.match(/^\/(en|es)/)?.[1] || 'en';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Match all pathnames except API and Next internals.
  matcher: ['/((?!api|_next|icons).*)'],
};
