import { NextResponse, type NextRequest } from 'next/server';
import { apiUrl, isSameOrigin, SESSION_COOKIE } from '@/lib/server';

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: { message: 'Cross-site request blocked' } }, { status: 403 });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    // Revoke server-side too, so a copied cookie stops working.
    await fetch(`${apiUrl()}/api/admin/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => undefined);
  }
  const out = NextResponse.json({ ok: true });
  out.cookies.delete(SESSION_COOKIE);
  return out;
}
