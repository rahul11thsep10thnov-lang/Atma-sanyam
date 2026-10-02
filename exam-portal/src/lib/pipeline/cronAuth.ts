import { timingSafeEqual } from "node:crypto";

/** Constant-time check of the scheduler's shared secret
 * (`Authorization: Bearer …` or `x-cron-secret`). No secret configured →
 * never authorised, so an unset variable can't open the endpoint. */
export function cronAuthorized(headers: Headers, secret: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  const header = headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : (headers.get("x-cron-secret") ?? "");
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
