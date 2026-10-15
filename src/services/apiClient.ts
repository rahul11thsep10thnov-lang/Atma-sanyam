// The one HTTP client. Two bearer tokens can be alive at once on a device —
// the guardian's and a player's (profile switcher) — so a request names the
// role it acts as; the matching token is attached.
import { env } from '../config/env';

export type Role = 'guardian' | 'player';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
  get isSubscriptionRequired() {
    return this.status === 402;
  }
}

const tokens: Record<Role, string | null> = { guardian: null, player: null };
const unauthorizedHandlers: Record<Role, (() => void) | null> = { guardian: null, player: null };

export function setAuthToken(role: Role, token: string | null) {
  tokens[role] = token;
}

export function getAuthToken(role: Role): string | null {
  return tokens[role];
}

// Lets the session layer sign out if the server revokes the session.
export function setUnauthorizedHandler(role: Role, handler: (() => void) | null) {
  unauthorizedHandlers[role] = handler;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Which token to send; false for none. */
  as?: Role | false;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!env.apiUrl) throw new ApiError(0, 'No server configured');
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  const role = opts.as === undefined ? 'guardian' : opts.as;
  const token = role ? tokens[role] : null;

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}${qs ? `?${qs}` : ''}`, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string; details?: unknown } } | null)?.error;
    if (res.status === 401 && role && token) unauthorizedHandlers[role]?.();
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.code, err?.details);
  }
  return data as T;
}

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}
