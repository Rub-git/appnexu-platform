import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const version = url.searchParams.get('v');
  const target = new URL('/icon-512.png', url.origin);

  if (version) {
    target.searchParams.set('v', version);
  }

  return NextResponse.redirect(target, 307);
}
