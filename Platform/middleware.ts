import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar archivos internos
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Si ya tiene locale, no tocar
  if (pathname.startsWith('/es') || pathname.startsWith('/en')) {
    return NextResponse.next()
  }

  // Redirigir a español por defecto
  return NextResponse.redirect(new URL(`/es${pathname}`, request.url))
}