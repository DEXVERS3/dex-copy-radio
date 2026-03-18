import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const publicPaths = [
    '/login',
    '/api/auth-login',
    '/favicon.ico',
  ];

  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$/);

  if (isPublic) {
    return NextResponse.next();
  }

  const gate = req.cookies.get('dex_gate')?.value;

  if (gate === 'open') {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
