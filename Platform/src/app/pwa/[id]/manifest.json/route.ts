import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppAssetVersion, getAppNamedIconUrl } from '@/lib/pwa-assets';

interface ManifestIcon {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
}

function getInstallDataFromRequestUrl(requestUrl: string, appId: string) {
    const pwaScope = `/pwa/${appId}/`;
    try {
        const origin = new URL(requestUrl).origin;
        const installId = `${origin}/pwa/${appId}`;
        return {
            startUrl: `${origin}/pwa/${appId}/launch`,
            scope: pwaScope,
            id: installId,
        };
    } catch {
        return {
            startUrl: `/pwa/${appId}/launch`,
            scope: pwaScope,
            id: `/pwa/${appId}`,
        };
    }
}

function resolveConfiguredPath(path: string | null | undefined, fallbackPath: string): string {
    const raw = (path || '').trim();
    if (!raw) return fallbackPath;

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
            const parsed = new URL(raw);
            return parsed.pathname || fallbackPath;
        } catch {
            return fallbackPath;
        }
    }

    return raw.startsWith('/') ? raw : `/${raw}`;
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
    const cleaned = candidate.toLowerCase().replace(/\s+/g, '');
    const blockedNames = new Set(['appnexu', 'appnexu.com', 'www.appnexu.com']);

    if (!candidate || blockedNames.has(cleaned)) {
        return manifestName;
    }

    return candidate;
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

        const app = await prisma.appProject.findUnique({
            where: { id: id },
        });

        if (!app) {
            return new NextResponse('App not found', { status: 404 });
        }

        if (app.pwaMode === 'IMPORT') {
            return NextResponse.json(
                {
                    error: 'IMPORT mode uses original site PWA assets',
                    manifestUrl: app.importedManifestUrl,
                    serviceWorkerUrl: app.importedSwUrl,
                },
                { status: 409 }
            );
        }

        const installData = getInstallDataFromRequestUrl(request.url, app.id);
        const configuredStartPath = resolveConfiguredPath(app.importedStartUrl, `/pwa/${app.id}/launch`);
        const defaultScope = `/pwa/${app.id}/`;
        const configuredScope = (app.importedScope || '').trim() || defaultScope;
        const origin = new URL(request.url).origin;
        const resolvedStartUrl = `${origin}${configuredStartPath}`;
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
                src: `/pwa/${app.id}/icons/maskable-192x192.png?v=${encodeURIComponent(version)}`,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable',
            },
            {
                src: `/pwa/${app.id}/icons/maskable-512x512.png?v=${encodeURIComponent(version)}`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
            },
        ];

        const shortName = normalizeShortName(app.shortName, manifestName);

        const manifest = {
            name: manifestName,
            short_name: shortName,
            id: installData.id,
            description: `${manifestName} - Progressive Web App`,
            start_url: resolvedStartUrl,
            scope: configuredScope,
            display: 'standalone',
            display_override: ['standalone'],
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
                    url: resolvedStartUrl,
                    icons: icons.length > 0 ? [icons[0]] : []
                }
            ]
        };

        return new NextResponse(JSON.stringify(manifest, null, 2), {
            headers: {
                'Content-Type': 'application/manifest+json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Manifest Generation Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
