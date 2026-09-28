import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth/config";
import type { AdminRole } from "@/generated/prisma/enums";

/**
 * Server-side authorization helpers. These are the ONLY sanctioned way to
 * check "who is signed in" / "are they allowed to do this" — Section 16
 * requires every admin route/action to re-check permissions server-side,
 * never relying on the UI simply hiding a button.
 */

export async function getCurrentAdmin() {
  const session = await getServerSession(authConfig);
  return session?.user ?? null;
}

/**
 * Use in a Server Component (e.g. the admin layout) to require sign-in,
 * redirecting to the login page otherwise.
 */
export async function requireAdmin(allowedRoles?: AdminRole[]) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    redirect("/admin/forbidden");
  }
  return admin;
}

/**
 * Use inside a Server Action or Route Handler, where a redirect isn't the
 * right response — throw and let the caller turn it into a 401/403 JSON
 * response instead.
 */
export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export async function requireAdminApi(allowedRoles?: AdminRole[]) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new UnauthorizedError("Sign in required.");
  }
  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    throw new ForbiddenError("You don't have permission to do this.");
  }
  return admin;
}
