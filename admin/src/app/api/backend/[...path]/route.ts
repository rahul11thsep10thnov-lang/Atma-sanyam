// Same-origin proxy from the browser to the admin API. The browser only ever
// holds an httpOnly cookie; this handler turns it into a Bearer token. The API
// still enforces every permission — this layer adds no authorization of its own.
import { NextResponse, type NextRequest } from 'next/server';
import { apiUrl, isSameOrigin, SESSION_COOKIE } from '@/lib/server';

const SEGMENT = /^[A-Za-z0-9_-]{1,100}$/;

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path.every((s) => SEGMENT.test(s))) {
    return NextResponse.json({ error: { message: 'Invalid path' } }, { status: 400 });
  }
  const mutating = !['GET', 'HEAD'].includes(req.method);
  if (mutating && !isSameOrigin(req)) {
    return NextResponse.json({ error: { message: 'Cross-site request blocked' } }, { status: 403 });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: { message: 'Not signed in' } }, { status: 401 });

  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl()}/api/admin/${path.join('/')}${req.nextUrl.search}`, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: mutating ? await req.text() : undefined,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: { message: 'The API is unreachable. Try again shortly.' } }, { status: 502 });
  }
  // Bytes, not text: the API also serves files (stored PDFs).
  const body = upstream.status === 204 ? null : await upstream.arrayBuffer();
  const headers: Record<string, string> = {
    'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    'Cache-Control': 'no-store',
  };
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers['Content-Disposition'] = disposition;
  const out = new NextResponse(body, { status: upstream.status, headers });
  if (upstream.status === 401) out.cookies.delete(SESSION_COOKIE);
  return out;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
