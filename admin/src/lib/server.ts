// Server-only helpers: the admin session token lives in an httpOnly cookie and
// is attached to backend calls here, so client-side JavaScript never sees it.
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'pe_admin';

export function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error('API_URL is not configured');
  return url.replace(/\/+$/, '');
}

export function cookieSecure(): boolean {
  if (process.env.ADMIN_COOKIE_SECURE === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export interface AdminMe {
  id: string;
  email: string;
  name: string;
  role: string;
  roleName: string;
  permissions: string[];
}

export async function getMe(): Promise<AdminMe | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${apiUrl()}/api/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminMe;
  } catch {
    return null;
  }
}

// Rejects cross-site state-changing requests (defense in depth on top of the
// SameSite=Strict cookie).
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
