import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/crypto";

export const USER_COOKIE = "sc_session";
const SESSION_DAYS = 30;

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.userSession.create({ data: { userId, tokenHash: sha256(token), expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const jar = await cookies();
  jar.set(USER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.userSession.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!s || s.expiresAt <= new Date()) return null;
  return s.user;
}

export async function destroyUserSession() {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (token) await prisma.userSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(USER_COOKIE);
}

export function isMember(user: { membershipUntil: Date | null } | null | undefined, now = new Date()) {
  return !!user?.membershipUntil && user.membershipUntil > now;
}

export type PublicUser = { id: string; mobileMasked: string; fullName: string | null; profileComplete: boolean; member: boolean; membershipUntil: string | null };
