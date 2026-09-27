import { Router } from 'express';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { admins } from '../../database/schema.js';
import { isStrongPassword, PASSWORD_RULE } from '../../database/seedAdmin.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../lib/httpError.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.js';
import { ROLE_KEYS, ROLES } from '../../lib/roles.js';
import { parse } from '../../middleware/validate.js';
import type { Auth } from '../../middleware/auth.js';
import type { RateLimits } from '../../middleware/rateLimits.js';
import { createAdminSession, revokeAdminSession, revokeAllAdminSessions } from '../../services/sessionService.js';
import type { AppDeps } from '../../types.js';
import { idParam } from '../util.js';

export function adminAuthRouter(deps: AppDeps, auth: Auth, limits: RateLimits) {
  const { db, env } = deps;
  const r = Router();

  r.post('/auth/login', limits.adminLogin, async (req, res) => {
    const body = parse(z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) }), req.body);
    const [admin] = await db.select().from(admins).where(sql`lower(${admins.email}) = ${body.email}`).limit(1);
    if (!admin) {
      await burnPasswordCheck(body.password); // same timing either way
      throw unauthorized('Wrong email or password.');
    }
    if (!(await verifyPassword(body.password, admin.passwordHash)) || admin.status !== 'active') {
      throw unauthorized('Wrong email or password.');
    }
    const session = await createAdminSession(db, admin.id, env.ADMIN_SESSION_TTL_HOURS);
    await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
    await audit(db, admin.id, 'admin.login', 'admin', admin.id);
    res.json({ token: session.token, expiresAt: session.expiresAt, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  });

  r.post('/auth/logout', auth.requireAdmin, async (req, res) => {
    await revokeAdminSession(db, req.admin!.sessionId);
    res.status(204).end();
  });

  r.get('/auth/me', auth.requireAdmin, (req, res) => {
    const a = req.admin!;
    res.json({ id: a.id, email: a.email, name: a.name, role: a.role, roleName: ROLES[a.role]?.name ?? a.role, permissions: [...a.permissions] });
  });

  r.post('/auth/password', auth.requireAdmin, async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().max(200), newPassword: z.string().max(200) }), req.body);
    const [admin] = await db.select().from(admins).where(eq(admins.id, req.admin!.id)).limit(1);
    if (!admin || !(await verifyPassword(body.currentPassword, admin.passwordHash))) throw badRequest('Current password is wrong.');
    if (!isStrongPassword(body.newPassword)) throw badRequest(`Password must be ${PASSWORD_RULE}.`);
    await db.update(admins).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(admins.id, admin.id));
    await revokeAllAdminSessions(db, admin.id);
    await audit(db, admin.id, 'admin.password_changed', 'admin', admin.id);
    res.status(204).end();
  });

  // --- Admin accounts (super admin only) -----------------------------------
  r.get('/admins', auth.requireAdmin, auth.can('admins:write'), async (_req, res) => {
    const rows = await db
      .select({ id: admins.id, email: admins.email, name: admins.name, role: admins.role, status: admins.status, lastLoginAt: admins.lastLoginAt, createdAt: admins.createdAt })
      .from(admins)
      .orderBy(asc(admins.createdAt));
    res.json({ items: rows, roles: Object.entries(ROLES).map(([key, v]) => ({ key, name: v.name, permissions: v.permissions })) });
  });

  r.post('/admins', auth.requireAdmin, auth.can('admins:write'), async (req, res) => {
    const body = parse(
      z.object({ email: z.email().max(200), name: z.string().trim().min(1).max(100), role: z.enum(ROLE_KEYS), password: z.string().max(200) }),
      req.body
    );
    if (!isStrongPassword(body.password)) throw badRequest(`Password must be ${PASSWORD_RULE}.`);
    const [exists] = await db.select({ id: admins.id }).from(admins).where(sql`lower(${admins.email}) = ${body.email.toLowerCase()}`).limit(1);
    if (exists) throw conflict('An admin with this email already exists.');
    const [row] = await db
      .insert(admins)
      .values({ email: body.email.toLowerCase(), name: body.name, role: body.role, passwordHash: await hashPassword(body.password) })
      .returning({ id: admins.id, email: admins.email, name: admins.name, role: admins.role, status: admins.status });
    await audit(db, req.admin!.id, 'admin.created', 'admin', row!.id, { role: body.role });
    res.status(201).json(row);
  });

  r.put('/admins/:id', auth.requireAdmin, auth.can('admins:write'), async (req, res) => {
    const id = idParam(req);
    const body = parse(
      z.object({
        name: z.string().trim().min(1).max(100).optional(),
        role: z.enum(ROLE_KEYS).optional(),
        status: z.enum(['active', 'archived']).optional(),
        password: z.string().max(200).optional(),
      }),
      req.body
    );
    if (id === req.admin!.id && (body.role || body.status === 'archived')) throw forbidden('You cannot change your own role or disable yourself.');
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name) patch.name = body.name;
    if (body.role) patch.role = body.role;
    if (body.status) patch.status = body.status;
    if (body.password) {
      if (!isStrongPassword(body.password)) throw badRequest(`Password must be ${PASSWORD_RULE}.`);
      patch.passwordHash = await hashPassword(body.password);
    }
    const [row] = await db.update(admins).set(patch).where(eq(admins.id, id)).returning({ id: admins.id });
    if (!row) throw notFound('Admin not found');
    if (body.password || body.status === 'archived' || body.role) await revokeAllAdminSessions(db, id);
    await audit(db, req.admin!.id, 'admin.updated', 'admin', id, { role: body.role, status: body.status, passwordReset: !!body.password });
    res.json({ id });
  });

  return r;
}
