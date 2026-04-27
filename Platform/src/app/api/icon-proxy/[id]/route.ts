import { NextResponse } from 'next/server';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import pngToIco from 'png-to-ico';
import { prisma } from '@/lib/prisma';

type IconVariant = 'any' | 'apple' | 'maskable' | 'favicon';
type IconOutputFormat = 'png' | 'ico';

function parseIconUrls(iconUrls: string | null | undefined): string[] {
  if (!iconUrls) return [];
  return iconUrls
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

function isRasterIcon(url: string): boolean {
  if (url.startsWith('upload:')) return true;
  if (url.startsWith('data:image/')) return true;
  return /\.(png|jpg|jpeg|webp)(\?|#|$)/i.test(url);
}

function normalizeIconUrl(rawUrl: string, targetUrl: string): string {
  // Never pass upload: or data: tokens through the URL parser — they are not HTTP URLs
  if (rawUrl.startsWith('upload:') || rawUrl.startsWith('data:')) return rawUrl;
  if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
  try {
    return new URL(rawUrl, targetUrl).toString();
  } catch {
    return rawUrl;
  }
}

function getOriginSafe(targetUrl: string): string | null {
  try {
    return new URL(targetUrl).origin;
  } catch {
    return null;
  }
}

function getIconCandidates(iconUrls: string[], targetUrl: string): string[] {
  const normalizedFromDb = iconUrls
    .map((url) => normalizeIconUrl(url, targetUrl))
    .filter(Boolean);

  const origin = getOriginSafe(targetUrl);
  const conventional = origin
    ? [
        `${origin}/apple-touch-icon.png`,
        `${origin}/android-chrome-512x512.png`,
        `${origin}/android-chrome-192x192.png`,
        `${origin}/favicon-512x512.png`,
        `${origin}/favicon-192x192.png`,
        `${origin}/favicon.png`,
        `${origin}/favicon.ico`,
      ]
    : [];

  // Prefer known raster icons first, then other provided icons, then common defaults.
  const rasterFirst = normalizedFromDb.filter(isRasterIcon);
  const rest = normalizedFromDb.filter((url) => !isRasterIcon(url));

  return [...new Set([...rasterFirst, ...rest, ...conventional])];
}

async function getPageDerivedIconCandidates(targetUrl: string): Promise<string[]> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 8000);

  try {
    const response = await fetch(targetUrl, {
      signal: abortController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AppnexuIconProxy/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const discovered: string[] = [];

    $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) discovered.push(href);
    });

    const ogImage = $('meta[property="og:image"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    if (ogImage) discovered.push(ogImage);
    if (twitterImage) discovered.push(twitterImage);

    return discovered
      .map((value) => normalizeIconUrl(value, targetUrl))
      .filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseVariant(value: string | null): IconVariant {
  if (value === 'apple' || value === 'maskable' || value === 'favicon') return value;
  return 'any';
}

function parseFormat(value: string | null): IconOutputFormat {
  return value === 'ico' ? 'ico' : 'png';
}

function logoSizeForVariant(size: number, variant: IconVariant): number {
  if (variant === 'maskable') return Math.round(size * 0.66);
  if (variant === 'favicon') return Math.round(size * 0.86);
  if (variant === 'apple') return Math.round(size * 0.8);
  return Math.round(size * 0.78);
}

async function trimAndNormalizeLogo(source: Buffer): Promise<Buffer> {
  const normalized = sharp(source, { failOn: 'none' }).rotate();

  try {
    return await normalized
      .trim({
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        threshold: 10,
      })
      .png()
      .toBuffer();
  } catch {
    return await normalized.png().toBuffer();
  }
}

async function renderLogoPng(
  source: Buffer,
  size: number,
  variant: IconVariant,
  themeColor?: string | null,
  backgroundColor?: string | null,
): Promise<Buffer> {
  const trimmed = await trimAndNormalizeLogo(source);
  const logoSize = Math.max(16, logoSizeForVariant(size, variant));
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  const logo = await sharp(trimmed)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      position: 'centre',
      background: transparent,
    })
    .png()
    .toBuffer();

  if (variant === 'maskable') {
    const bg = backgroundColor || '#0F172A';
    const overlay = themeColor || '#178BFF';
    const maskableCanvas = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
            <stop stop-color="${overlay}"/>
            <stop offset="1" stop-color="${bg}"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#g)"/>
      </svg>
    `;

    return sharp(Buffer.from(maskableCanvas))
      .composite([{ input: logo, gravity: 'centre' }])
      .png()
      .toBuffer();
  }

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent,
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function encodeIconOutput(
  pngBuffer: Buffer,
  size: number,
  format: IconOutputFormat,
): Promise<{ contentType: string; body: Uint8Array }> {
  if (format === 'ico') {
    const sizes = [16, 32, Math.min(64, size)].filter((value, index, list) => list.indexOf(value) === index);
    const frames = await Promise.all(
      sizes.map((iconSize) => sharp(pngBuffer).resize(iconSize, iconSize).png().toBuffer()),
    );
    const ico = await pngToIco(frames);
    return {
      contentType: 'image/x-icon',
      body: Uint8Array.from(Buffer.from(ico)),
    };
  }

  return {
    contentType: 'image/png',
    body: Uint8Array.from(pngBuffer),
  };
}

function asBinaryStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function fetchIconBuffer(url: string): Promise<Buffer | null> {
  // Handle upload: tokens — raw base64 PNG stored without data URI prefix
  if (url.startsWith('upload:')) {
    try {
      const base64Data = url.slice('upload:'.length);
      return Buffer.from(base64Data, 'base64');
    } catch {
      return null;
    }
  }

  // Handle legacy data: URLs directly — no network fetch needed
  if (url.startsWith('data:image/')) {
    try {
      const base64Index = url.indexOf(';base64,');
      if (base64Index === -1) return null;
      const base64Data = url.slice(base64Index + 8);
      return Buffer.from(base64Data, 'base64');
    } catch {
      return null;
    }
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10000);

  try {
    const sourceResponse = await fetch(url, {
      signal: abortController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AppnexuIconProxy/1.0)',
      },
      cache: 'no-store',
    });

    if (!sourceResponse.ok) {
      return null;
    }

    const bytes = await sourceResponse.arrayBuffer();
    const sourceBuffer = Buffer.from(bytes);

    return sourceBuffer;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
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
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
    const variant = parseVariant(requestUrl.searchParams.get('variant'));
    const format = parseFormat(requestUrl.searchParams.get('format'));
    // Fast path: if there is a manually-uploaded icon (upload:BASE64), serve it immediately
    // without hitting the network or running expensive scraping.
    const uploadToken = iconUrls.find((u) => u.startsWith('upload:'));
    if (uploadToken) {
      const base64Data = uploadToken.slice('upload:'.length);
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const png = await renderLogoPng(buffer, size, variant, app.themeColor, app.backgroundColor);
        const encoded = await encodeIconOutput(png, size, format);
        return new NextResponse(asBinaryStream(encoded.body), {
          headers: { 'Content-Type': encoded.contentType, 'Cache-Control': 'no-store' },
        });
      } catch {
        // corrupted token — fall through to normal chain
      }
    }

    console.log(`[icon-proxy] id=${id} size=${size} variant=${variant} format=${format} uploadToken=${uploadToken ? 'yes('+Math.round(uploadToken.length/1024)+'KB)' : 'no'} iconUrls_count=${iconUrls.length}`);

    const pageDerivedCandidates = await getPageDerivedIconCandidates(app.targetUrl);
    const iconCandidates = [...new Set([...getIconCandidates(iconUrls, app.targetUrl), ...pageDerivedCandidates])];

    for (const candidate of iconCandidates) {
      const sourceBuffer = await fetchIconBuffer(candidate);
      if (sourceBuffer) {
        const pngBuffer = await renderLogoPng(sourceBuffer, size, variant, app.themeColor, app.backgroundColor);
        const encoded = await encodeIconOutput(pngBuffer, size, format);
        return new NextResponse(asBinaryStream(encoded.body), {
          headers: {
            'Content-Type': encoded.contentType,
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    const fallback = await getFallbackPng(size, app.appName, app.targetUrl, app.themeColor, app.backgroundColor);
    const encodedFallback = await encodeIconOutput(fallback, size, format);
    return new NextResponse(asBinaryStream(encodedFallback.body), {
      headers: {
        'Content-Type': encodedFallback.contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Icon proxy error:', error);
    try {
      const fallback = await getFallbackPng(size, 'Generated App', requestUrl.origin, '#178BFF', '#0F172A');
      const format = parseFormat(requestUrl.searchParams.get('format'));
      const encodedFallback = await encodeIconOutput(fallback, size, format);
      return new NextResponse(asBinaryStream(encodedFallback.body), {
        headers: {
          'Content-Type': encodedFallback.contentType,
          'Cache-Control': 'no-store',
        },
      });
    } catch {
      return new NextResponse('Unable to generate icon', { status: 500 });
    }
  }
}
