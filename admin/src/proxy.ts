// Next.js 16 "proxy" (formerly middleware): bounce visitors without a session
// cookie to /login. Real validation happens server-side in the console layout
// and, above all, in the API on every request.
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has('pe_admin');
  const { pathname } = req.nextUrl;
  if (!hasSession && pathname !== '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
