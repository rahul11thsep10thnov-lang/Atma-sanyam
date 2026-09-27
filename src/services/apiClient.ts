import { env } from '../config/env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// Lets the auth layer sign the user out if the server revokes the session
// (e.g. account deactivated by an admin).
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  auth?: boolean;
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

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}${qs ? `?${qs}` : ''}`, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.auth !== false && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
    const err = (data as { error?: { message?: string; code?: string } } | null)?.error;
    if (res.status === 401 && authToken && opts.auth !== false) onUnauthorized?.();
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.code);
  }
  return data as T;
}

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}
