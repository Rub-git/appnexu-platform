import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/settings', '/admin'];

// Known platform hostnames (add your production domain here)
const PLATFORM_HOSTS = [
  'localhost',
  '127.0.0.1',
  'appnexu.com',
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
  const host = hostname.split(':')[0];
  return PLATFORM_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`) || host.endsWith('.vercel.app') || host.endsWith('.preview.abacusai.app')
  );
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';
  const hostNoPort = hostname.split(':')[0].toLowerCase();

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

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/pwa') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  const pathnameWithoutLocale = pathname.replace(/^\/(en|es)/, '') || '/';

  const isProtectedRoute = protectedRoutes.some(route =>
    pathnameWithoutLocale.startsWith(route)
  );

  if (isProtectedRoute) {
    const sessionToken = request.cookies.get('authjs.session-token')?.value ||
                         request.cookies.get('__Secure-authjs.session-token')?.value;

    if (!sessionToken) {
      const locale = pathname.match(/^\/(en|es)/)?.[1] || 'en';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|icons).*)'],
};
