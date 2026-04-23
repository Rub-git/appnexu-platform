import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ManifestIcon {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
}

function parseIconUrls(iconUrls: string | null | undefined): string[] {
    if (!iconUrls) return [];
    return iconUrls
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);
}

function resolveAbsoluteIconUrl(rawUrl: string, targetUrl: string): string {
    if (rawUrl.startsWith('//')) {
        return `https:${rawUrl}`;
    }
    try {
        return new URL(rawUrl, targetUrl).toString();
    } catch {
        return rawUrl;
    }
}

function normalizeTargetInstallData(targetUrl: string) {
    try {
        const target = new URL(targetUrl);
        return {
            startUrl: target.toString(),
            scope: `${target.origin}/`,
            id: target.toString(),
            fallbackIcon: `${target.origin}/favicon.ico`,
        };
    } catch {
        return {
            startUrl: targetUrl,
            scope: '/',
            id: targetUrl,
            fallbackIcon: '/favicon.ico',
        };
    }
}

export const dynamic = 'force-dynamic';

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

        const storedIconUrls = parseIconUrls(app.iconUrls);
        const resolvedStoredIcons = storedIconUrls
            .map((url) => resolveAbsoluteIconUrl(url, app.targetUrl))
            .filter(Boolean);

        const installData = normalizeTargetInstallData(app.targetUrl);
        const icons = resolvedStoredIcons.length > 0
            ? [
                {
                    src: resolvedStoredIcons[0],
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable',
                },
                {
                    src: resolvedStoredIcons[0],
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable',
                },
            ]
            : [
                {
                    src: installData.fallbackIcon,
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable',
                },
                {
                    src: installData.fallbackIcon,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable',
                },
            ];

        // Generate short_name - truncate to 12 characters if needed (PWA requirement)
        const shortName = (app.shortName || app.appName).substring(0, 12);

        const manifest = {
            name: app.appName,
            short_name: shortName,
            id: installData.id,
            description: `${app.appName} - Progressive Web App`,
            start_url: installData.startUrl,
            scope: installData.scope,
            display: 'standalone',
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
                    name: `Open ${app.appName}`,
                    short_name: 'Open',
                    description: `Open ${app.appName}`,
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
