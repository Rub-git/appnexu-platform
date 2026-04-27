import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppAssetVersion, getAppNamedIconUrl } from '@/lib/pwa-assets';

interface ManifestIcon {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
}

function getInstallData(appId: string) {
    const scope = `/pwa/${appId}/`;
    return {
        startUrl: `${scope}launch`,
        scope,
        id: scope,
    };
}

function getInstallDataForMode(
    app: { id: string; slug: string; customDomain: string | null },
    mode: string | null,
    value: string | null,
) {
    if (mode === 'slug' && value && value === app.slug) {
        const scope = `/app/${app.slug}`;
        return {
            startUrl: `${scope}?pwa=true`,
            scope,
            id: scope,
        };
    }

    if (mode === 'domain' && value && app.customDomain && value === app.customDomain) {
        // Custom domains are externally served at '/' and internally rewritten.
        // Keep manifest scope at root so installability checks run in-scope.
        const scope = '/';
        return {
            startUrl: '/?pwa=true',
            scope,
            id: '/app/_domain/' + app.customDomain,
        };
    }

    return getInstallData(app.id);
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
    const blockedNames = new Set(['appnexu', 'appnexu.com', 'www.appnexu.com']);

    return blockedNames.has(normalized) ? fallback : trimmed;
}

function normalizeShortName(shortName: string | null, manifestName: string): string {
    const candidate = (shortName || '').trim();
    const source = candidate.length > 0 ? candidate : manifestName;
    const cleaned = source.toLowerCase().replace(/\s+/g, '');
    const blockedNames = new Set(['appnexu', 'appnexu.com', 'www.appnexu.com']);

    const effective = blockedNames.has(cleaned) ? manifestName : source;
    if (candidate.length > 0) {
        return candidate.substring(0, 12);
    }

    const words = effective.split(/\s+/).map((word) => word.trim()).filter(Boolean);
    if (words.length >= 2) {
        const firstWord = words[0].substring(0, 12);
        if (firstWord.length >= 4) return firstWord;

        const acronym = words.map((word) => word[0] || '').join('').toUpperCase().substring(0, 10);
        if (acronym.length >= 2) return acronym;
    }

    return effective.substring(0, 12);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const requestUrl = new URL(request.url);

        const app = await prisma.appProject.findUnique({
            where: { id: id },
        });

        if (!app) {
            return new NextResponse('App not found', { status: 404 });
        }

        const installData = getInstallDataForMode(
            { id: app.id, slug: app.slug, customDomain: app.customDomain },
            requestUrl.searchParams.get('mode'),
            requestUrl.searchParams.get('value'),
        );
        const manifestName = normalizeManifestName(app.appName, app.targetUrl);
        const version = getAppAssetVersion(app);
        const icons: ManifestIcon[] = [
            {
                src: getAppNamedIconUrl(app.id, 'icon-192.png', version),
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: getAppNamedIconUrl(app.id, 'icon-512.png', version),
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: getAppNamedIconUrl(app.id, 'maskable-icon.png', version),
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: getAppNamedIconUrl(app.id, 'icon-512.png', version),
                sizes: '512x512',
                type: 'image/png',
                purpose: 'monochrome',
            },
        ];

        // Generate short_name - truncate to 12 characters if needed (PWA requirement)
        const shortName = normalizeShortName(app.shortName, manifestName);

        const manifest = {
            name: manifestName,
            short_name: shortName,
            id: installData.id,
            description: `${manifestName} - Progressive Web App`,
            start_url: installData.startUrl,
            scope: installData.scope,
            display: 'standalone',
            display_override: ['window-controls-overlay', 'standalone'],
            orientation: 'portrait-primary',
            theme_color: app.themeColor || '#178BFF',
            background_color: app.backgroundColor || '#ffffff',
            icons: icons,
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
                    icons: icons.length > 0 ? [icons[0]] : []
                }
            ]
        };

        return new NextResponse(JSON.stringify(manifest, null, 2), {
            headers: {
                'Content-Type': 'application/manifest+json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Manifest Generation Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
