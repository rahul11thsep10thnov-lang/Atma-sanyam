import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { adminSessions, guardianSessions, playerSessions } from '../database/schema.js';
import { generateToken, hashToken } from '../lib/tokens.js';

export async function createGuardianSession(db: Db, guardianId: string, ttlDays: number, extra: { stepUpAt?: Date; deviceId?: string | null } = {}) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  await db.insert(guardianSessions).values({ guardianId, tokenHash: hashToken(token), expiresAt, stepUpAt: extra.stepUpAt ?? null, deviceId: extra.deviceId ?? null });
  return { token, expiresAt };
}

export async function createPlayerSession(db: Db, childId: string, ttlDays: number, deviceId: string | null) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  await db.insert(playerSessions).values({ childId, tokenHash: hashToken(token), expiresAt, deviceId });
  return { token, expiresAt };
}

export async function createAdminSession(db: Db, adminId: string, ttlHours: number) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000);
  await db.insert(adminSessions).values({ adminId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function revokeAllGuardianSessions(db: Db, guardianId: string, exceptSessionId?: string) {
  const now = new Date();
  await db
    .update(guardianSessions)
    .set({ revokedAt: now })
    .where(and(eq(guardianSessions.guardianId, guardianId), isNull(guardianSessions.revokedAt)));
  if (exceptSessionId) await db.update(guardianSessions).set({ revokedAt: null }).where(eq(guardianSessions.id, exceptSessionId));
}

export async function revokeAllPlayerSessions(db: Db, childId: string) {
  await db
    .update(playerSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(playerSessions.childId, childId), isNull(playerSessions.revokedAt)));
}

export async function revokeAllAdminSessions(db: Db, adminId: string) {
  await db.delete(adminSessions).where(eq(adminSessions.adminId, adminId));
}
