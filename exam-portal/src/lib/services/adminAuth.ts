import { prisma } from "@/lib/db/client";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/services/auditLog";
import type { AdminUser } from "@/generated/prisma/client";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export type AdminAuthResult =
  | { ok: true; admin: AdminUser }
  | { ok: false; reason: "invalid_credentials" | "locked" | "inactive" };

/**
 * The one place admin credentials are checked (Section 3: business logic
 * centralized in the service layer, not inlined into the NextAuth config
 * or a route handler). Mirrors the account-lockout design already used by
 * the FOCUS backend in this repo: 5 consecutive failures locks the
 * account for 15 minutes, the client only ever sees a generic error, and
 * a bcrypt comparison always runs — even for an unknown email — so
 * response timing can't be used to enumerate valid admin addresses.
 */
export async function authenticateAdmin(
  emailInput: string,
  password: string,
): Promise<AdminAuthResult> {
  const email = emailInput.trim().toLowerCase();
  const admin = await prisma.adminUser.findUnique({ where: { email } });

  if (!admin) {
    await burnPasswordCheck();
    return { ok: false, reason: "invalid_credentials" };
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return { ok: false, reason: "locked" };
  }

  const passwordOk = await verifyPassword(password, admin.passwordHash);
  if (!passwordOk) {
    const failedLoginCount = admin.failedLoginCount + 1;
    const lock = failedLoginCount >= MAX_FAILED_LOGINS;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: lock ? 0 : failedLoginCount,
        lockedUntil: lock
          ? new Date(Date.now() + LOCK_MINUTES * 60_000)
          : admin.lockedUntil,
      },
    });
    return { ok: false, reason: "invalid_credentials" };
  }

  if (!admin.isActive) {
    return { ok: false, reason: "inactive" };
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await recordAuditLog({
    adminUserId: admin.id,
    action: "LOGIN",
    contentType: "AdminUser",
    contentId: admin.id,
  });

  return { ok: true, admin };
}
