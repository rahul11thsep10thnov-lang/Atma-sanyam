import { Router } from 'express';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { adminSessions, admins, roles } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, unauthorized } from '../../lib/httpError.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.js';
import { normalizeEmail } from '../../lib/strings.js';
import { audit } from '../../lib/audit.js';
import { createAdminSession } from '../../services/sessionService.js';
import type { AppDeps } from '../../types.js';

export const adminPassword = z
  .string()
  .min(12, 'Admin passwords must be at least 12 characters')
  .max(128)
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), 'Use upper- and lower-case letters and a number');

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export function adminAuthRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env } = deps;
  const r = Router();

  r.post('/login', limits.login, async (req, res) => {
    const body = parse(z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }), req.body);
    const [admin] = await db.select().from(admins).where(eq(admins.email, normalizeEmail(body.email)));
    const genericError = unauthorized('Incorrect email or password');

    if (!admin) {
      await burnPasswordCheck(body.password);
      throw genericError;
    }
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw unauthorized(`Too many failed attempts. This account is locked for up to ${LOCK_MINUTES} minutes.`);
    }
    const ok = await verifyPassword(body.password, admin.passwordHash);
    if (!ok) {
      const failed = admin.failedLoginCount + 1;
      await db
        .update(admins)
        .set({
          failedLoginCount: failed >= MAX_FAILED_LOGINS ? 0 : failed,
          lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : admin.lockedUntil,
        })
        .where(eq(admins.id, admin.id));
      if (failed >= MAX_FAILED_LOGINS) await audit(db, admin.id, 'admin.locked', 'admin', admin.id);
      throw genericError;
    }
    if (admin.status !== 'active') throw unauthorized('This admin account has been deactivated.');

    await db
      .update(admins)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(admins.id, admin.id));
    // Opportunistic cleanup of this admin's expired sessions.
    await db.delete(adminSessions).where(and(eq(adminSessions.adminId, admin.id), sql`${adminSessions.expiresAt} < now()`));
    const session = await createAdminSession(db, admin.id, env.ADMIN_SESSION_TTL_HOURS);
    await audit(db, admin.id, 'admin.login', 'admin', admin.id);
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString() });
  });

  r.post('/logout', auth.requireAdmin, async (req, res) => {
    await db.delete(adminSessions).where(eq(adminSessions.id, req.admin!.sessionId));
    res.status(204).end();
  });

  r.get('/me', auth.requireAdmin, async (req, res) => {
    const a = req.admin!;
    const [role] = await db.select().from(roles).where(eq(roles.key, a.roleKey));
    res.json({
      id: a.id,
      email: a.email,
      name: a.name,
      role: { key: a.roleKey, name: role?.name ?? a.roleKey },
      permissions: [...a.permissions].sort(),
    });
  });

  r.post('/change-password', auth.requireAdmin, async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().min(1).max(128), newPassword: adminPassword }), req.body);
    const [admin] = await db.select().from(admins).where(eq(admins.id, req.admin!.id));
    if (!admin || !(await verifyPassword(body.currentPassword, admin.passwordHash))) {
      throw badRequest('Current password is incorrect');
    }
    await db
      .update(admins)
      .set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() })
      .where(eq(admins.id, admin.id));
    // Invalidate every other session for this admin.
    await db
      .delete(adminSessions)
      .where(and(eq(adminSessions.adminId, admin.id), sql`${adminSessions.id} <> ${req.admin!.sessionId}`));
    await audit(db, admin.id, 'admin.password_changed', 'admin', admin.id);
    res.status(204).end();
  });

  return r;
}
