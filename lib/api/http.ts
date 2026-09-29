import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const json = (body: unknown, init?: ResponseInit) => NextResponse.json(body, init);
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });
export const notFound = (error: string) => NextResponse.json({ error }, { status: 404 });

export function clientKey(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local").slice(0, 64);
}

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window, in-memory rate limiter. Fine for a single instance; on a
 * multi-instance deployment put a shared store (Redis) or the platform's WAF in
 * front instead — the call sites stay the same.
 */
export function rateLimit(request: NextRequest, name: string, limit: number, windowMs = 60_000): NextResponse | null {
  const now = Date.now();
  const key = `${name}:${clientKey(request)}`;
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return null;
  }
  b.count += 1;
  if (b.count > limit) {
    return NextResponse.json(
      { error: "Too many requests — please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((b.resetAt - now) / 1000)) } }
    );
  }
  return null;
}

export function intParam(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? Math.trunc(value) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function enumParam<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function enumList<T extends string>(value: unknown, allowed: readonly T[], max = 12): T[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(raw.filter((v): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v)))].slice(0, max);
}

/**
 * Admin API gate. With ADMIN_API_TOKEN set, callers must send it as `x-admin-token`.
 * Without it the admin API is open in development and disabled in production.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Admin API is disabled: set ADMIN_API_TOKEN." }, { status: 403 })
      : null;
  }
  const given = request.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
