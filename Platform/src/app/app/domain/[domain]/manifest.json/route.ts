import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomDomainCandidates, normalizeCustomDomain } from '@/lib/custom-domain';
import { getAppAssetVersion } from '@/lib/pwa-assets';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

function getInstallDataFromRequestUrl(requestUrl: string) {
  try {
    const origin = new URL(requestUrl).origin;
    const scope = `${origin}/`;
    return {
      startUrl: `${origin}/launch`,
      scope,
      id: scope,
    };
  } catch {
    return {
      startUrl: '/launch',
      scope: '/',
      id: '/',
    };
  }
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
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const normalizedDomain = normalizeCustomDomain(domain);
    const domainCandidates = getCustomDomainCandidates(normalizedDomain);

    const app = await prisma.appProject.findFirst({
      where: { customDomain: { in: domainCandidates } },
    });

    if (!app || app.status !== 'PUBLISHED') {
      return new NextResponse('App not found', { status: 404 });
    }

    if (app.pwaMode === 'IMPORT' && app.importedManifestUrl) {
      return NextResponse.redirect(app.importedManifestUrl, 307);
    }

    const manifestName = normalizeManifestName(app.appName, app.targetUrl);
    const shortName = normalizeShortName(app.shortName, manifestName);
    const version = getAppAssetVersion(app);

    const icons: ManifestIcon[] = [
      {
        src: `/icons/icon-192x192.png?v=${encodeURIComponent(version)}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icons/icon-512x512.png?v=${encodeURIComponent(version)}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icons/maskable-192x192.png?v=${encodeURIComponent(version)}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `/icons/maskable-512x512.png?v=${encodeURIComponent(version)}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ];

    const installData = getInstallDataFromRequestUrl(request.url);

    const manifest = {
      name: manifestName,
      short_name: shortName,
      id: installData.id,
      description: `${manifestName} - Progressive Web App`,
      start_url: installData.startUrl,
      scope: installData.scope,
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
          url: installData.startUrl,
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
