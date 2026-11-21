import { createHmac, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { and, count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../database/client.js';
import { abuseEvents, appSettings, mockTests, subscriptions, testAttempts, users } from '../database/schema.js';
import { HttpError } from '../lib/httpError.js';
import { log } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Free-quota protection for guest accounts.
//
// A guest account costs nothing to create, so "2 free tests per account" alone
// can be farmed by clearing browser storage. Two privacy-conscious signals
// group guest accounts:
//   - device:  the browser's random device id (X-Device-Id header, kept in
//              local storage) — survives a new guest session, not a reset;
//   - network: the network prefix (IPv4 /24, IPv6 /48) + the browser's
//              user-agent — survives a storage reset, but is shared by
//              people on one Wi-Fi, so its limit is several times higher.
// Both are stored only as HMACs with a server secret; raw IPs and ids are
// never stored. Signed-in users (Google / mobile OTP) are counted per
// account only. When a group has used its free tests, a guest is asked to
// sign in (free) — never blocked from tests they already started.
// ---------------------------------------------------------------------------

export const accessPolicySchema = z.object({
  enabled: z.boolean(),
  /** Days of history counted for shared-device / shared-network free tests. */
  windowDays: z.number().int().min(1).max(365),
  /** Free tests per device = the free quota × this. */
  deviceMultiplier: z.number().int().min(1).max(20),
  /** Free tests per network+browser = the free quota × this (shared Wi-Fi). */
  networkMultiplier: z.number().int().min(1).max(100),
  maxGuestAccountsPerDevicePerDay: z.number().int().min(1).max(1000),
  maxGuestAccountsPerNetworkPerHour: z.number().int().min(1).max(10000),
});
export type AccessPolicy = z.infer<typeof accessPolicySchema>;

export const DEFAULT_ACCESS_POLICY: AccessPolicy = {
  enabled: true,
  windowDays: 30,
  deviceMultiplier: 1,
  networkMultiplier: 3,
  maxGuestAccountsPerDevicePerDay: 5,
  maxGuestAccountsPerNetworkPerHour: 30,
};

const POLICY_KEY = 'access_policy';
const SECRET_KEY = 'abuse_hash_secret';

export async function getAccessPolicy(db: Db): Promise<AccessPolicy> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, POLICY_KEY)).limit(1);
  const merged = { ...DEFAULT_ACCESS_POLICY, ...((row?.value as Partial<AccessPolicy>) ?? {}) };
  const parsed = accessPolicySchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_ACCESS_POLICY;
}

export async function updateAccessPolicy(db: Db, patch: Partial<AccessPolicy>, adminId: string) {
  const next = accessPolicySchema.parse({ ...(await getAccessPolicy(db)), ...patch });
  await db
    .insert(appSettings)
    .values({ key: POLICY_KEY, value: next, updatedBy: adminId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedBy: adminId, updatedAt: new Date() } });
  return next;
}

let cachedSecret: string | null = null;
/** HMAC key: ABUSE_HASH_SECRET if set, else a random key created once and
 * kept in the database (stable across restarts and instances). */
async function hashSecret(db: Db): Promise<string> {
  if (process.env.ABUSE_HASH_SECRET) return process.env.ABUSE_HASH_SECRET;
  if (cachedSecret) return cachedSecret;
  await db
    .insert(appSettings)
    .values({ key: SECRET_KEY, value: { secret: randomBytes(32).toString('hex') } })
    .onConflictDoNothing();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, SECRET_KEY)).limit(1);
  cachedSecret = (row!.value as { secret: string }).secret;
  return cachedSecret;
}

export interface ClientSignals {
  deviceHash: string | null;
  networkHash: string | null;
}

function networkPrefix(ip: string): string {
  const v4 = ip.replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.split('.').slice(0, 3).join('.') + '.0/24';
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::/48';
  return ip;
}

/** Hashed device + network signals for a request (no raw values kept). */
export async function clientSignals(db: Db, req: Request): Promise<ClientSignals> {
  const secret = await hashSecret(db);
  const h = (v: string) => createHmac('sha256', secret).update(v).digest('hex').slice(0, 32);
  const device = String(req.get('x-device-id') ?? '').trim();
  const ua = String(req.get('user-agent') ?? '').slice(0, 300);
  const ip = req.ip ?? '';
  return {
    deviceHash: /^[A-Za-z0-9-]{16,64}$/.test(device) ? h(`device:${device}`) : null,
    networkHash: ip ? h(`network:${networkPrefix(ip)}|${ua}`) : null,
  };
}

export async function recordAbuse(db: Db, kind: string, s: ClientSignals, userId: string | null, details: Record<string, unknown> = {}) {
  await db.insert(abuseEvents).values({ kind, userId, deviceHash: s.deviceHash, networkHash: s.networkHash, details });
  log.warn('abuse.detected', { kind, ...details });
}

/** Refuses creating yet another guest account from the same device / network
 * too quickly (429). Shared networks get a much higher limit. */
export async function assertGuestCreationAllowed(db: Db, s: ClientSignals) {
  const policy = await getAccessPolicy(db);
  if (!policy.enabled) return;
  if (s.deviceHash) {
    const [row] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.authProvider, 'guest'), eq(users.deviceHash, s.deviceHash), gte(users.createdAt, new Date(Date.now() - 86_400_000))));
    if (Number(row?.n ?? 0) >= policy.maxGuestAccountsPerDevicePerDay) {
      await recordAbuse(db, 'guest_accounts_per_device', s, null, { count: Number(row?.n ?? 0) });
      throw new HttpError(429, 'Is device se bahut zyada naye guest account ban rahe hain. Kripya login karein (free).', 'login_required');
    }
  }
  if (s.networkHash) {
    const [row] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.authProvider, 'guest'), eq(users.networkHash, s.networkHash), gte(users.createdAt, new Date(Date.now() - 3_600_000))));
    if (Number(row?.n ?? 0) >= policy.maxGuestAccountsPerNetworkPerHour) {
      await recordAbuse(db, 'guest_accounts_per_network', s, null, { count: Number(row?.n ?? 0) });
      throw new HttpError(429, 'Is network se bahut zyada naye guest account ban rahe hain. Kripya thodi der baad ya login karke try karein.', 'login_required');
    }
  }
}

/**
 * For a guest starting a NEW free test: refuses (403 login_required) when the
 * guest accounts on this device — or, with a higher limit, this network and
 * browser — have already used the free tests of this kind. Signed-in users and
 * subscribers are not affected.
 */
export async function assertGuestClusterQuota(db: Db, userId: string, kind: 'full' | 'subject', freeLimit: number, s: ClientSignals) {
  const policy = await getAccessPolicy(db);
  if (!policy.enabled) return;
  const [user] = await db.select({ provider: users.authProvider }).from(users).where(eq(users.id, userId)).limit(1);
  if (user?.provider !== 'guest') return;
  const since = new Date(Date.now() - policy.windowDays * 86_400_000);
  const used = async (column: typeof testAttempts.deviceHash | typeof testAttempts.networkHash, value: string) => {
    const [row] = await db
      .select({ n: countDistinct(sql`${testAttempts.userId}::text || ':' || ${testAttempts.mockTestId}::text`) })
      .from(testAttempts)
      .innerJoin(mockTests, eq(mockTests.id, testAttempts.mockTestId))
      .innerJoin(users, eq(users.id, testAttempts.userId))
      .where(
        and(
          eq(column, value),
          eq(mockTests.kind, kind),
          eq(users.authProvider, 'guest'),
          gte(testAttempts.startedAt, since),
          // Tests started while subscribed are not free tests.
          sql`not exists (select 1 from ${subscriptions} s where s.user_id = ${testAttempts.userId} and s.status = 'active' and s.starts_at <= ${testAttempts.startedAt})`
        )
      );
    return Number(row?.n ?? 0);
  };
  // Runs inside the start transaction, so it does not write: the route
  // records the abuse event after the transaction has rolled back.
  const refuse = (scope: 'device' | 'network', usedCount: number, limit: number): never => {
    throw new HttpError(
      403,
      'Is device / network par free tests pehle hi use ho chuke hain. Free mein login karein (Google ya mobile OTP) aur apne free tests jaari rakhein.',
      'login_required',
      { kind, scope, used: usedCount, limit }
    );
  };
  if (s.deviceHash) {
    const limit = freeLimit * policy.deviceMultiplier;
    const n = await used(testAttempts.deviceHash, s.deviceHash);
    if (n >= limit) refuse('device', n, limit);
  }
  if (s.networkHash) {
    const limit = freeLimit * policy.networkMultiplier;
    const n = await used(testAttempts.networkHash, s.networkHash);
    if (n >= limit) refuse('network', n, limit);
  }
}

/** Admin view: counts per kind over N days and the latest events. Hashes are
 * shortened; no personal data is included. */
export async function abuseReport(db: Db, days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const byKind = await db
    .select({ kind: abuseEvents.kind, n: count() })
    .from(abuseEvents)
    .where(gte(abuseEvents.createdAt, since))
    .groupBy(abuseEvents.kind);
  const recent = await db
    .select()
    .from(abuseEvents)
    .where(gte(abuseEvents.createdAt, since))
    .orderBy(desc(abuseEvents.createdAt))
    .limit(100);
  const [guests] = await db.select({ n: count() }).from(users).where(and(eq(users.authProvider, 'guest'), gte(users.createdAt, since)));
  return {
    days,
    guestAccountsCreated: Number(guests?.n ?? 0),
    byKind: byKind.map((r) => ({ kind: r.kind, count: Number(r.n) })),
    recent: recent.map((e) => ({
      id: e.id,
      kind: e.kind,
      createdAt: e.createdAt,
      device: e.deviceHash?.slice(0, 8) ?? null,
      network: e.networkHash?.slice(0, 8) ?? null,
      userId: e.userId,
      details: e.details,
    })),
  };
}

