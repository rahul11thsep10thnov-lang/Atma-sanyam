'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: string; message: string }[]
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return `/api/backend/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Query } = {}
): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 401) {
    window.location.href = `/login?expired=1&next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, 'Your session has expired');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { message?: string; details?: { path: string; message: string }[] } } | null)?.error;
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details?.length) return `${err.message}: ${err.details.map((d) => `${d.path || 'value'} — ${d.message}`).join('; ')}`;
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

// Tiny data hook: keeps the previous data while refetching so the layout
// doesn't jump; exposes reload() for after mutations.
export function useApi<T>(path: string | null, query?: Query) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = path ? buildUrl(path, query) : null;
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api<T>(path, { query });
      if (id === seq.current) setData(result);
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
