// Who is calling. Three kinds of bearer token, three tables, no overlap: a
// guardian token never works on a player route and vice versa, and neither
// works on an admin route. Every protected route then adds what it needs:
// a recent one-time code (step-up) for sensitive actions, an active paid
// subscription (entitlement) for anything a child plays or a guardian
// configures, and the child-belongs-to-guardian check inside the handler.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { adminSessions, admins, children, guardianSessions, guardians, playerSessions, rolePermissions } from '../database/schema.js';
import type { Permission } from '../database/rbac.js';
import { HttpError, forbidden, unauthorized } from '../lib/httpError.js';
import { hashToken } from '../lib/tokens.js';
import { getEntitlement } from '../services/entitlementService.js';
import type { AppDeps } from '../types.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;
const SLIDE_AFTER_MS = 60 * 60 * 1000;
// A one-time code passed this recently lets a guardian do sensitive things.
export const STEP_UP_WINDOW_MIN = 15;

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return TOKEN_RE.test(token) ? token : null;
}

export const entitlementRequired = () => new HttpError(402, 'An active LoJi subscription is needed for this.', 'subscription_required');
export const stepUpRequired = () => new HttpError(403, 'Please confirm this with a fresh verification code.', 'step_up_required');

export function createAuth({ db, env }: AppDeps) {
  async function resolveGuardian(req: Request): Promise<void> {
    const token = bearerToken(req);
    if (!token) return;
    const now = new Date();
    const [row] = await db
      .select({
        sessionId: guardianSessions.id,
        lastUsedAt: guardianSessions.lastUsedAt,
        stepUpAt: guardianSessions.stepUpAt,
        id: guardians.id,
        phone: guardians.phone,
        name: guardians.name,
        status: guardians.status,
      })
      .from(guardianSessions)
      .innerJoin(guardians, eq(guardians.id, guardianSessions.guardianId))
      .where(
        and(
          eq(guardianSessions.tokenHash, hashToken(token)),
          gt(guardianSessions.expiresAt, now),
          isNull(guardianSessions.revokedAt),
          sql`${guardians.status} <> 'deactivated'`
        )
      )
      .limit(1);
    if (!row) return;
    if (now.getTime() - row.lastUsedAt.getTime() > SLIDE_AFTER_MS) {
      const expiresAt = new Date(now.getTime() + env.GUARDIAN_SESSION_TTL_DAYS * 86_400_000);
      await db.update(guardianSessions).set({ lastUsedAt: now, expiresAt }).where(eq(guardianSessions.id, row.sessionId));
      await db.update(guardians).set({ lastSeenAt: now }).where(eq(guardians.id, row.id));
    }
    req.guardian = { id: row.id, phone: row.phone, name: row.name, status: row.status, sessionId: row.sessionId, stepUpAt: row.stepUpAt };
  }

  async function resolvePlayer(req: Request): Promise<void> {
    const token = bearerToken(req);
    if (!token) return;
    const now = new Date();
    const [row] = await db
      .select({
        sessionId: playerSessions.id,
        lastUsedAt: playerSessions.lastUsedAt,
        deviceId: playerSessions.deviceId,
        childId: children.id,
        guardianId: children.guardianId,
        displayName: children.displayName,
        ageBracket: children.ageBracket,
        bracketOverride: children.bracketOverride,
        guardianStatus: guardians.status,
      })
      .from(playerSessions)
      .innerJoin(children, eq(children.id, playerSessions.childId))
      .innerJoin(guardians, eq(guardians.id, children.guardianId))
      .where(
        and(
          eq(playerSessions.tokenHash, hashToken(token)),
          gt(playerSessions.expiresAt, now),
          isNull(playerSessions.revokedAt),
          eq(children.status, 'active'),
          eq(guardians.status, 'active')
        )
      )
      .limit(1);
    if (!row) return;
    if (now.getTime() - row.lastUsedAt.getTime() > SLIDE_AFTER_MS) {
      await db.update(playerSessions).set({ lastUsedAt: now }).where(eq(playerSessions.id, row.sessionId));
    }
    req.player = {
      childId: row.childId,
      guardianId: row.guardianId,
      displayName: row.displayName,
      ageBracket: row.ageBracket,
      effectiveBracket: row.bracketOverride ?? row.ageBracket,
      sessionId: row.sessionId,
      deviceId: row.deviceId,
    };
  }

  const requireGuardian: RequestHandler = async (req, _res, next) => {
    try {
      await resolveGuardian(req);
      if (!req.guardian) throw unauthorized();
      next();
    } catch (err) {
      next(err);
    }
  };

  const requirePlayer: RequestHandler = async (req, _res, next) => {
    try {
      await resolvePlayer(req);
      if (!req.player) throw unauthorized();
      next();
    } catch (err) {
      next(err);
    }
  };

  // Either kind, for shared endpoints such as the WebSocket ticket.
  const requireGuardianOrPlayer: RequestHandler = async (req, _res, next) => {
    try {
      await resolveGuardian(req);
      if (!req.guardian) await resolvePlayer(req);
      if (!req.guardian && !req.player) throw unauthorized();
      next();
    } catch (err) {
      next(err);
    }
  };

  // Must run after requireGuardian.
  const requireStepUp: RequestHandler = (req, _res, next) => {
    const at = req.guardian?.stepUpAt;
    if (!at || Date.now() - at.getTime() > STEP_UP_WINDOW_MIN * 60_000) return next(stepUpRequired());
    next();
  };

  // Must run after requireGuardian or requirePlayer. Loads the household's
  // entitlement and refuses with 402 unless it is active right now.
  const requireEntitlement: RequestHandler = async (req, _res, next) => {
    try {
      const guardianId = req.guardian?.id ?? req.player?.guardianId;
      if (!guardianId) throw unauthorized();
      const ent = await getEntitlement(db, guardianId);
      req.entitlement = ent;
      if (!ent.active) throw entitlementRequired();
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

  return { requireGuardian, requirePlayer, requireGuardianOrPlayer, requireStepUp, requireEntitlement, requireAdmin, requirePermission };
}

export type Auth = ReturnType<typeof createAuth>;
