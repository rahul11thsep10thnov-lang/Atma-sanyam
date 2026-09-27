import { NextResponse, type NextRequest } from 'next/server';
import { apiUrl, cookieSecure, isSameOrigin, SESSION_COOKIE } from '@/lib/server';

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: { message: 'Cross-site request blocked' } }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: 'Malformed request' } }, { status: 400 });
  }
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: { message: 'The API is unreachable. Try again shortly.' } }, { status: 502 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const { token, expiresAt } = data as { token: string; expiresAt: string };
  const maxAge = Math.max(60, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
  return out;
}
