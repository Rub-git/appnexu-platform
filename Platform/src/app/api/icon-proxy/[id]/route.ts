import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';

function parseIconUrls(iconUrls: string | null | undefined): string[] {
  if (!iconUrls) return [];
  return iconUrls
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

function isRasterIcon(url: string): boolean {
  return /\.(png|jpg|jpeg|webp)(\?|#|$)/i.test(url);
}

function normalizeIconUrl(rawUrl: string, targetUrl: string): string {
  if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
  try {
    return new URL(rawUrl, targetUrl).toString();
  } catch {
    return rawUrl;
  }
}

function getInitials(appName: string, targetUrl: string): string {
  const words = appName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }

  try {
    const hostname = new URL(targetUrl).hostname.replace(/^www\./, '');
    return hostname.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'AP';
  } catch {
    return 'AP';
  }
}

async function getFallbackPng(size: number, appName: string, targetUrl: string, themeColor?: string | null, backgroundColor?: string | null): Promise<Buffer> {
  const initials = getInitials(appName, targetUrl);
  const primary = themeColor || '#178BFF';
  const secondary = backgroundColor || '#0F172A';
  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="64" y1="48" x2="448" y2="464" gradientUnits="userSpaceOnUse">
          <stop stop-color="${primary}"/>
          <stop offset="1" stop-color="${secondary}"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#bg)"/>
      <circle cx="402" cy="122" r="56" fill="rgba(255,255,255,0.18)"/>
      <circle cx="132" cy="392" r="72" fill="rgba(255,255,255,0.12)"/>
      <rect x="92" y="92" width="328" height="328" rx="96" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" stroke-width="8"/>
      <text x="256" y="290" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="160" font-weight="700" fill="#FFFFFF">${initials}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .png()
    .resize(size, size)
    .toBuffer();
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestUrl = new URL(request.url);
  const requestedSize = Number.parseInt(requestUrl.searchParams.get('size') || '180', 10);
  const size = Number.isFinite(requestedSize) ? Math.max(64, Math.min(512, requestedSize)) : 180;

  try {
    const app = await prisma.appProject.findUnique({ where: { id } });
    if (!app) {
      return new NextResponse('App not found', { status: 404 });
    }

    const iconUrls = parseIconUrls(app.iconUrls);
    const preferred = iconUrls.find(isRasterIcon) || iconUrls[0];

    if (!preferred) {
      const fallback = await getFallbackPng(size, app.appName, app.targetUrl, app.themeColor, app.backgroundColor);
      return new NextResponse(new Uint8Array(fallback), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    const sourceUrl = normalizeIconUrl(preferred, app.targetUrl);

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10000);

    let sourceBuffer: Buffer;
    try {
      const sourceResponse = await fetch(sourceUrl, {
        signal: abortController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AppnexuIconProxy/1.0)',
        },
        cache: 'no-store',
      });

      if (!sourceResponse.ok) {
        throw new Error(`Icon fetch failed: ${sourceResponse.status}`);
      }

      const bytes = await sourceResponse.arrayBuffer();
      sourceBuffer = Buffer.from(bytes);
    } finally {
      clearTimeout(timeout);
    }

    const pngBuffer = await sharp(sourceBuffer)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Icon proxy error:', error);
    try {
      const fallback = await getFallbackPng(size, 'Appnexu App', 'https://appnexu.com', '#178BFF', '#0F172A');
      return new NextResponse(new Uint8Array(fallback), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=600, s-maxage=3600',
        },
      });
    } catch {
      return new NextResponse('Unable to generate icon', { status: 500 });
    }
  }
}
