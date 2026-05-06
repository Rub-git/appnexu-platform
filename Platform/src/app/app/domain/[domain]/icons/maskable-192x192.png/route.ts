import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCustomDomain } from '@/lib/custom-domain';
import { getAppAssetVersion } from '@/lib/pwa-assets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;
  const normalizedDomain = normalizeCustomDomain(domain);

  const app = await prisma.appProject.findUnique({
    where: { customDomain: normalizedDomain },
    select: { id: true, status: true, updatedAt: true, lastGeneratedAt: true, iconUrls: true },
  });

  if (!app || app.status !== 'PUBLISHED') {
    return new NextResponse('App not found', { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const version = requestUrl.searchParams.get('v') || getAppAssetVersion(app);
  const target = new URL(
    `/api/icon-proxy/${app.id}?size=192&variant=maskable&format=png&v=${encodeURIComponent(version)}`,
    requestUrl.origin,
  );

  return NextResponse.redirect(target, 307);
}
