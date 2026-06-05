import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { logger } from '@/lib/logger';

const intlMiddleware = createMiddleware(routing);

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/settings', '/billing', '/admin'];

// Known platform hostnames (add your production domain here)
function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.+$/, '');
}

function expandPlatformHosts(rawHost: string): string[] {
  const normalized = normalizeHost(rawHost);
  if (!normalized) return [];

  const hosts = new Set<string>([normalized]);

  if (normalized.startsWith('www.')) {
    hosts.add(normalized.slice(4));
  } else {
    hosts.add(`www.${normalized}`);
  }

  return Array.from(hosts);
}

const PLATFORM_HOSTS = Array.from(
  new Set([
    ...expandPlatformHosts('localhost'),
    ...expandPlatformHosts('127.0.0.1'),
    ...expandPlatformHosts('appnexu.com'),
    ...expandPlatformHosts(process.env.NEXT_PUBLIC_APP_DOMAIN || ''),
  ]),
);

const CUSTOM_DOMAIN_ROOT_ASSETS = new Set([
  '/manifest.json',
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/maskable-icon.png',
]);

function isPlatformHost(hostname: string): boolean {
  // Remove port from hostname
  const host = normalizeHost(hostname.split(':')[0]);
  return PLATFORM_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`) || host.endsWith('.vercel.app') || host.endsWith('.preview.abacusai.app')
  );
}

function getHostFromRequest(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = forwardedHost || request.headers.get('host') || '';
  return normalizeHost(hostHeader.split(',')[0] || '');
}

function rewriteForCustomDomain(request: NextRequest, customDomain: string): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  let destinationPath = pathname;

  if (pathname === '/') {
    destinationPath = `/app/domain/${customDomain}`;
  } else if (pathname === '/launch') {
    destinationPath = `/app/domain/${customDomain}/launch`;
  } else if (CUSTOM_DOMAIN_ROOT_ASSETS.has(pathname)) {
    destinationPath = `/app/domain/${customDomain}${pathname}`;
  }

  if (destinationPath === pathname) {
    return NextResponse.next();
  }

  const rewriteUrl = new URL(`${destinationPath}${search}`, request.url);
  return NextResponse.rewrite(rewriteUrl);
}

export default function proxy(request: NextRequest) {
  const host = getHostFromRequest(request);
  const pathname = request.nextUrl.pathname;

  if (host && !isPlatformHost(host)) {
    return rewriteForCustomDomain(request, host);
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
  const isProtectedRoute = protectedRoutes.some((route) => pathnameWithoutLocale.startsWith(route));

  if (isProtectedRoute) {
    const sessionToken = request.cookies.get('authjs.session-token')?.value || request.cookies.get('__Secure-authjs.session-token')?.value;

    if (!sessionToken) {
      const locale = pathname.match(/^\/(en|es)/)?.[1] || 'en';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      logger.info('middleware.redirect', 'Protected route redirect to login', {
        pathname,
        locale,
        redirectDestination: loginUrl.toString(),
      });
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
    '/manifest.json',
    '/sw.js',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/maskable-icon.png',
    '/launch',
  ],
};
