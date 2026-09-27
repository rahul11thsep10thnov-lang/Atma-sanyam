import type { SupabaseIdentity } from '../types.js';

// Asks Supabase Auth who owns an access token (works for any signing key
// setup, no JWT secret needed). Results are cached briefly so a burst of
// requests doesn't hammer Supabase.
export function createSupabaseVerifier(url: string, anonKey: string, fetchImpl: typeof fetch = fetch) {
  const cache = new Map<string, { identity: SupabaseIdentity | null; until: number }>();
  return async function verify(token: string): Promise<SupabaseIdentity | null> {
    const hit = cache.get(token);
    if (hit && hit.until > Date.now()) return hit.identity;
    const res = await fetchImpl(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    let identity: SupabaseIdentity | null = null;
    if (res.ok) {
      const body = (await res.json()) as {
        id?: string;
        email?: string | null;
        phone?: string | null;
        user_metadata?: { full_name?: string; name?: string };
      };
      if (body.id) {
        identity = {
          id: body.id,
          email: body.email || null,
          phone: body.phone || null,
          name: body.user_metadata?.full_name ?? body.user_metadata?.name ?? null,
        };
      }
    } else if (res.status >= 500) {
      throw new Error(`Supabase auth unavailable (${res.status})`);
    }
    cache.set(token, { identity, until: Date.now() + 60_000 });
    if (cache.size > 5000) cache.clear();
    return identity;
  };
}
