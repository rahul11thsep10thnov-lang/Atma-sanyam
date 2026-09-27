import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { and, eq, gt, sql } from 'drizzle-orm';
import { adminSessions, admins, rolePermissions, userSessions, users } from '../database/schema.js';
import type { Permission } from '../database/rbac.js';
import { forbidden, unauthorized } from '../lib/httpError.js';
import { hashToken } from '../lib/tokens.js';
import type { AppDeps } from '../types.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;
const SLIDE_AFTER_MS = 60 * 60 * 1000;

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return TOKEN_RE.test(token) ? token : null;
}

export function createAuth({ db, env }: AppDeps) {
  async function resolveUser(req: Request): Promise<void> {
    const token = bearerToken(req);
    if (!token) return;
    const now = new Date();
    const [row] = await db
      .select({
        sessionId: userSessions.id,
        lastUsedAt: userSessions.lastUsedAt,
        userId: users.id,
        email: users.email,
      })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.userId))
      .where(and(eq(userSessions.tokenHash, hashToken(token)), gt(userSessions.expiresAt, now), eq(users.status, 'active')))
      .limit(1);
    if (!row) return;

    // Sliding expiry, written at most once an hour to keep reads cheap.
    if (now.getTime() - row.lastUsedAt.getTime() > SLIDE_AFTER_MS) {
      const expiresAt = new Date(now.getTime() + env.USER_SESSION_TTL_DAYS * 86_400_000);
      await db.update(userSessions).set({ lastUsedAt: now, expiresAt }).where(eq(userSessions.id, row.sessionId));
      await db.update(users).set({ lastSeenAt: now }).where(eq(users.id, row.userId));
    }
    req.user = { id: row.userId, email: row.email, sessionId: row.sessionId };
  }

  const optionalUser: RequestHandler = async (req, _res, next) => {
    try {
      await resolveUser(req);
      next();
    } catch (err) {
      next(err);
    }
  };

  const requireUser: RequestHandler = async (req, _res, next) => {
    try {
      await resolveUser(req);
      if (!req.user) throw unauthorized();
      next();
    } catch (err) {
      next(err);
    }
  };

  const requireAdmin: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearerToken(req);
      if (!token) throw unauthorized();
      const now = new Date();
      const [row] = await db
        .select({
          sessionId: adminSessions.id,
          lastUsedAt: adminSessions.lastUsedAt,
          id: admins.id,
          email: admins.email,
          name: admins.name,
          roleKey: admins.roleKey,
        })
        .from(adminSessions)
        .innerJoin(admins, eq(admins.id, adminSessions.adminId))
        .where(
          and(eq(adminSessions.tokenHash, hashToken(token)), gt(adminSessions.expiresAt, now), eq(admins.status, 'active'))
        )
        .limit(1);
      if (!row) throw unauthorized('Your session has expired. Please sign in again.');

      const perms = await db
        .select({ key: rolePermissions.permissionKey })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleKey, row.roleKey));

      if (now.getTime() - row.lastUsedAt.getTime() > 5 * 60 * 1000) {
        await db.update(adminSessions).set({ lastUsedAt: sql`now()` }).where(eq(adminSessions.id, row.sessionId));
      }

      req.admin = {
        id: row.id,
        email: row.email,
        name: row.name,
        roleKey: row.roleKey,
        sessionId: row.sessionId,
        permissions: new Set(perms.map((p) => p.key as Permission)),
      };
      next();
    } catch (err) {
      next(err);
    }
  };

  // Must run after requireAdmin. Every admin route declares what it needs;
  // hiding buttons in the console is only UX, this is the actual check.
  const requirePermission =
    (...needed: Permission[]): RequestHandler =>
    (req, _res, next) => {
      const admin = req.admin;
      if (!admin) return next(unauthorized());
      const missing = needed.filter((p) => !admin.permissions.has(p));
      if (missing.length > 0) return next(forbidden());
      next();
    };

  return { optionalUser, requireUser, requireAdmin, requirePermission };
}

export type Auth = ReturnType<typeof createAuth>;
