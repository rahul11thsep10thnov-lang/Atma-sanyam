import { Router } from 'express';
import { z } from 'zod';
import { and, asc, count, eq, ne } from 'drizzle-orm';
import { admins, rolePermissions, roles } from '../../database/schema.js';
import { ROLE_KEYS } from '../../database/rbac.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, notFound } from '../../lib/httpError.js';
import { hashPassword } from '../../lib/password.js';
import { normalizeEmail } from '../../lib/strings.js';
import { audit } from '../../lib/audit.js';
import { revokeAllAdminSessions } from '../../services/sessionService.js';
import type { AppDeps } from '../../types.js';
import { adminPassword } from './auth.js';

const idParam = z.string().uuid();
const roleKey = z.enum(ROLE_KEYS);

function adminView(a: typeof admins.$inferSelect) {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    roleKey: a.roleKey,
    status: a.status,
    lastLoginAt: a.lastLoginAt,
    lockedUntil: a.lockedUntil,
    createdAt: a.createdAt,
  };
}

export function adminAdminsRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  async function activeSuperAdmins(excludingId?: string) {
    const conds = [eq(admins.roleKey, 'super_admin'), eq(admins.status, 'active')];
    if (excludingId) conds.push(ne(admins.id, excludingId));
    const [row] = await db.select({ n: count() }).from(admins).where(and(...conds));
    return row?.n ?? 0;
  }

  r.get('/roles', auth.requirePermission('admins:read'), async (_req, res) => {
    const roleRows = await db.select().from(roles).orderBy(asc(roles.key));
    const links = await db.select().from(rolePermissions);
    res.json(
      roleRows.map((role) => ({
        ...role,
        permissions: links.filter((l) => l.roleKey === role.key).map((l) => l.permissionKey).sort(),
      }))
    );
  });

  r.get('/admins', auth.requirePermission('admins:read'), async (_req, res) => {
    const rows = await db.select().from(admins).orderBy(asc(admins.createdAt));
    res.json(rows.map(adminView));
  });

  r.post('/admins', auth.requirePermission('admins:write'), async (req, res) => {
    const body = parse(
      z.object({
        email: z.string().trim().email().max(254),
        name: z.string().trim().min(1).max(80),
        roleKey,
        password: adminPassword,
      }),
      req.body
    );
    const email = normalizeEmail(body.email);
    const [clash] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
    if (clash) throw conflict('An admin with this email already exists');
    const [row] = await db
      .insert(admins)
      .values({ email, name: body.name, roleKey: body.roleKey, passwordHash: await hashPassword(body.password) })
      .returning();
    await audit(db, req.admin!.id, 'admin.created', 'admin', row!.id, { email, roleKey: body.roleKey });
    res.status(201).json(adminView(row!));
  });

  r.patch('/admins/:id', auth.requirePermission('admins:write'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const body = parse(
      z.object({
        name: z.string().trim().min(1).max(80).optional(),
        roleKey: roleKey.optional(),
        status: z.enum(['active', 'deactivated']).optional(),
        password: adminPassword.optional(),
        unlock: z.boolean().optional(),
      }),
      req.body
    );
    const [existing] = await db.select().from(admins).where(eq(admins.id, id));
    if (!existing) throw notFound('Admin not found');

    const isSelf = id === req.admin!.id;
    if (isSelf && (body.roleKey !== undefined || body.status !== undefined)) {
      throw badRequest('You cannot change your own role or status');
    }
    const losingSuperAdmin =
      existing.roleKey === 'super_admin' &&
      existing.status === 'active' &&
      ((body.roleKey && body.roleKey !== 'super_admin') || body.status === 'deactivated');
    if (losingSuperAdmin && (await activeSuperAdmins(id)) === 0) {
      throw conflict('There must always be at least one active super admin');
    }

    const [row] = await db
      .update(admins)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.roleKey !== undefined ? { roleKey: body.roleKey } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
        ...(body.unlock ? { lockedUntil: null, failedLoginCount: 0 } : {}),
        updatedAt: new Date(),
      })
      .where(eq(admins.id, id))
      .returning();

    // Role/status/password changes take effect immediately.
    if (!isSelf && (body.roleKey || body.status === 'deactivated' || body.password)) {
      await revokeAllAdminSessions(db, id);
    }
    await audit(db, req.admin!.id, 'admin.updated', 'admin', id, {
      ...(body.name ? { name: body.name } : {}),
      ...(body.roleKey ? { roleKey: body.roleKey } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.password ? { passwordReset: true } : {}),
      ...(body.unlock ? { unlocked: true } : {}),
    });
    res.json(adminView(row!));
  });

  r.delete('/admins/:id', auth.requirePermission('admins:write'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    if (id === req.admin!.id) throw badRequest('You cannot delete your own account');
    const [existing] = await db.select().from(admins).where(eq(admins.id, id));
    if (!existing) throw notFound('Admin not found');
    if (existing.roleKey === 'super_admin' && existing.status === 'active' && (await activeSuperAdmins(id)) === 0) {
      throw conflict('There must always be at least one active super admin');
    }
    await db.delete(admins).where(eq(admins.id, id));
    await audit(db, req.admin!.id, 'admin.deleted', 'admin', id, { email: existing.email });
    res.status(204).end();
  });

  return r;
}
