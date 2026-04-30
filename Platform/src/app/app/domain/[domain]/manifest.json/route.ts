import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCustomDomain } from '@/lib/custom-domain';
import { getAppAssetVersion } from '@/lib/pwa-assets';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

function getFallbackNameFromTarget(targetUrl: string): string {
  try {
    return new URL(targetUrl).hostname.replace(/^www\./i, '');
  } catch {
    return 'My App';
  }
}

function normalizeManifestName(appName: string, targetUrl: string): string {
  const trimmed = (appName || '').trim();
  const fallback = getFallbackNameFromTarget(targetUrl);
  if (!trimmed) return fallback;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, '');
  const blocked = new Set(['appnexu', 'appnexu.com', 'www.appnexu.com']);
  return blocked.has(normalized) ? fallback : trimmed;
}

function normalizeShortName(shortName: string | null, manifestName: string): string {
  const candidate = (shortName || '').trim();
  if (!candidate) return manifestName;

  const normalized = candidate.toLowerCase().replace(/\s+/g, '');
  const blocked = new Set(['appnexu', 'appnexu.com', 'www.appnexu.com']);
  return blocked.has(normalized) ? manifestName : candidate;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const normalizedDomain = normalizeCustomDomain(domain);

    const app = await prisma.appProject.findUnique({
      where: { customDomain: normalizedDomain },
    });

    if (!app || app.status !== 'PUBLISHED') {
      return new NextResponse('App not found', { status: 404 });
    }

    const manifestName = normalizeManifestName(app.appName, app.targetUrl);
    const shortName = normalizeShortName(app.shortName, manifestName);
    const version = getAppAssetVersion(app);

    const icons: ManifestIcon[] = [
      {
        src: `/icon-192.png?v=${encodeURIComponent(version)}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-512.png?v=${encodeURIComponent(version)}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ];

    const manifest = {
      name: manifestName,
      short_name: shortName,
      id: '/',
      description: `${manifestName} - Progressive Web App`,
      start_url: '/launch',
      scope: '/',
      display: 'standalone',
      display_override: ['standalone'],
      orientation: 'portrait-primary',
      theme_color: app.themeColor || '#178BFF',
      background_color: app.backgroundColor || '#ffffff',
      icons,
      categories: ['utilities'],
      lang: 'en',
      dir: 'ltr',
      prefer_related_applications: false,
      shortcuts: [
        {
          name: `Open ${manifestName}`,
          short_name: 'Open',
          description: `Open ${manifestName}`,
          url: '/launch',
          icons: icons.length > 0 ? [icons[0]] : [],
        },
      ],
    };

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
