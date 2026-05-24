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

// ...existing code...

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

export default intlMiddleware;
