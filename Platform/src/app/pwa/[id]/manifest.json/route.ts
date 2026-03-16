import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ManifestIcon {
    src: string;
    sizes: string;
    type: string;
    purpose: string;
}

// Helper function to parse iconUrls from comma-separated string
function parseIconUrls(iconUrls: string | null | undefined): string[] {
    if (!iconUrls || iconUrls.trim() === '') {
        return [];
    }
    return iconUrls
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
}

// Helper to determine image type from URL
function getImageType(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.svg')) return 'image/svg+xml';
    if (lowerUrl.includes('.webp')) return 'image/webp';
    if (lowerUrl.includes('.ico')) return 'image/x-icon';
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'image/jpeg';
    return 'image/png';
}

// Generate icons array from parsed URLs or use defaults
function generateIcons(iconUrls: string[]): ManifestIcon[] {
    const defaultIcons: ManifestIcon[] = [
        {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
        },
        {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
        }
    ];

    if (iconUrls.length === 0) {
        return defaultIcons;
    }

    const icons: ManifestIcon[] = [];
    
    // Add provided icons with appropriate sizes
    iconUrls.forEach((url, index) => {
        const type = getImageType(url);
        
        // First icon gets 192x192, second gets 512x512, rest get both
        if (index === 0) {
            icons.push({
                src: url,
                sizes: '192x192',
                type,
                purpose: 'any maskable'
            });
        }
        if (index === 1 || iconUrls.length === 1) {
            icons.push({
                src: url,
                sizes: '512x512',
                type,
                purpose: 'any maskable'
            });
        }
        if (index > 1) {
            icons.push({
                src: url,
                sizes: '512x512',
                type,
                purpose: 'any'
            });
        }
    });

    // Ensure we have at least the required sizes
    const has192 = icons.some(i => i.sizes === '192x192');
    const has512 = icons.some(i => i.sizes === '512x512');
    
    if (!has192) {
        icons.unshift(defaultIcons[0]);
    }
    if (!has512) {
        icons.push(defaultIcons[1]);
    }

    return icons;
}

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

        // Parse iconUrls from comma-separated string
        const parsedIconUrls = parseIconUrls(app.iconUrls);
        const icons = generateIcons(parsedIconUrls);

        // Generate short_name - truncate to 12 characters if needed (PWA requirement)
        const shortName = (app.shortName || app.appName).substring(0, 12);

        const manifest = {
            name: app.appName,
            short_name: shortName,
            description: `${app.appName} - Progressive Web App`,
            start_url: '/',
            scope: '/',
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
                    url: '/',
                    icons: icons.length > 0 ? [icons[0]] : []
                }
            ]
        };

        return new NextResponse(JSON.stringify(manifest, null, 2), {
            headers: {
                'Content-Type': 'application/manifest+json',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Manifest Generation Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
