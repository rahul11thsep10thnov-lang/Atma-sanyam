import { eq } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { adminSessions, userSessions } from '../database/schema.js';
import { generateToken, hashToken } from '../lib/tokens.js';

export async function createUserSession(db: Db, userId: string, ttlDays: number) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  await db.insert(userSessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function createAdminSession(db: Db, adminId: string, ttlHours: number) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000);
  await db.insert(adminSessions).values({ adminId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function revokeAllUserSessions(db: Db, userId: string) {
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
}

export async function revokeAllAdminSessions(db: Db, adminId: string) {
  await db.delete(adminSessions).where(eq(adminSessions.adminId, adminId));
}
