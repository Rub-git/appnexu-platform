import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ManifestIcon {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
}

function buildManifestIcons(appId: string): ManifestIcon[] {
    return [
        {
            src: `/api/icon-proxy/${appId}?size=192`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
        },
        {
            src: `/api/icon-proxy/${appId}?size=512`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
        }
    ];
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

        const icons = buildManifestIcons(id);

        // Generate short_name - truncate to 12 characters if needed (PWA requirement)
        const shortName = (app.shortName || app.appName).substring(0, 12);

        const pwaScope = `/pwa/${id}/`;
        const pwaStartUrl = `${pwaScope}launch`;

        const manifest = {
            name: app.appName,
            short_name: shortName,
            id: `/pwa/${id}`,
            description: `${app.appName} - Progressive Web App`,
            start_url: pwaStartUrl,
            scope: pwaScope,
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
                    url: pwaStartUrl,
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
