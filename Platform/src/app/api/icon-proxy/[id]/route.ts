import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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

async function getFallbackPng(size: number): Promise<Buffer> {
  const fallbackPath = path.join(process.cwd(), 'public', 'icons', 'icon-512.png');
  const fallbackBuffer = await readFile(fallbackPath);
  return sharp(fallbackBuffer)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
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
      const fallback = await getFallbackPng(size);
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
      const fallback = await getFallbackPng(size);
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
