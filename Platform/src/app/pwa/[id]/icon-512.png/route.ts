import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestUrl = new URL(request.url);
  const version = requestUrl.searchParams.get('v') || String(Date.now());

  const target = new URL(`/api/icon-proxy/${id}?size=512&variant=any&format=png&v=${encodeURIComponent(version)}`, requestUrl.origin);
  return NextResponse.redirect(target, 307);
}
