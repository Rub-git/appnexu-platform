import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppAssetVersion, getAppIconUrl } from '@/lib/pwa-assets';

interface ManifestIcon {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
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

        const installData = normalizeTargetInstallData(app.targetUrl);
        const version = getAppAssetVersion(app);
        const icons: ManifestIcon[] = [
            {
                src: getAppIconUrl(app.id, 192, version),
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable',
            },
            {
                src: getAppIconUrl(app.id, 512, version),
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
