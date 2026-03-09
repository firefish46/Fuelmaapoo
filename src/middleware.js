import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

const PUBLIC_PATHS = ['/login'];
const GOVT_ONLY = ['/limits', '/pumps', '/employees'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const token = request.cookies.get('fuel_token')?.value;

  if (PUBLIC_PATHS.includes(pathname)) {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!token) return NextResponse.redirect(new URL('/login', request.url));

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.redirect(new URL('/login', request.url));

  if (GOVT_ONLY.some(p => pathname.startsWith(p)) && payload.role !== 'govt') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};