import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/http";
import { safeSession } from "./session";

export type AdminAccess = "open" | "allowed" | "denied";

/**
 * Admin UI access. Development: open. Production: only signed-in users whose
 * email is listed in ADMIN_EMAILS (comma-separated) — everyone else is denied.
 */
export async function adminAccess(): Promise<AdminAccess> {
  if (process.env.NODE_ENV !== "production") return "open";
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return "denied";
  const session = await safeSession();
  const email = session?.user?.email?.toLowerCase();
  return email && allowed.includes(email) ? "allowed" : "denied";
}

/**
 * Gate for admin API routes: a valid `x-admin-token` (ADMIN_API_TOKEN) or an allowed admin session.
 * Returns a 401/403 response to send, or null when the caller may proceed.
 */
export async function authorizeAdmin(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.ADMIN_API_TOKEN && request.headers.get("x-admin-token")) return requireAdmin(request);
  if ((await adminAccess()) !== "denied") return null;
  return NextResponse.json({ error: "Admin access required: sign in as an ADMIN_EMAILS user or send x-admin-token." }, { status: 401 });
}
