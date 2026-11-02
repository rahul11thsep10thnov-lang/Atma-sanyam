// DADU domain logic shared by the public and admin routers: child ownership,
// world-state merging, mastery updates from progress events, screen time,
// the published-content view and pack building.
import { createHash } from 'node:crypto';
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import {
  daduAssignmentCompletions,
  daduChildProfiles,
  daduConsents,
  daduContentItems,
  daduContentVersions,
  daduFeatureFlags,
  daduMastery,
  daduPacks,
  daduProgressEvents,
  daduScreenRules,
  daduScreenTime,
  daduWorldStates,
} from '../database/schema.js';
import { masteryState, updateMastery } from '../dadu/mastery.js';
import type { MasteryRow } from '../dadu/mastery.js';
import type { ProgressEvent, WorldState } from '../dadu/contracts.js';
import { LANGS } from '../dadu/contracts.js';

export const MAX_CHILDREN = 5;

export function childView(c: typeof daduChildProfiles.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    band: c.band,
    difficulty: c.difficulty,
    language: c.language,
    helperLanguage: c.helperLanguage,
    languageMode: c.languageMode,
    avatar: c.avatar,
    templeEnabled: c.templeEnabled,
    createdAt: c.createdAt.getTime(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function listChildren(db: Db, userId: string) {
  return db
    .select()
    .from(daduChildProfiles)
    .where(and(eq(daduChildProfiles.userId, userId), isNull(daduChildProfiles.deletedAt)))
    .orderBy(asc(daduChildProfiles.createdAt));
}

export async function findOwnedChild(db: Db, userId: string, childId: string) {
  const [row] = await db
    .select()
    .from(daduChildProfiles)
    .where(and(eq(daduChildProfiles.id, childId), eq(daduChildProfiles.userId, userId), isNull(daduChildProfiles.deletedAt)))
    .limit(1);
  return row ?? null;
}

// ---- world state ---------------------------------------------------------

const union = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b])];

/**
 * Merge a stale client copy onto the newer server copy. The client wins for
 * rewards, mastery (per concept) and the completion unions, because those are
 * things the child earned on the device; the server copy wins for the rest.
 */
export function mergeWorld(server: WorldState, client: WorldState): WorldState {
  return {
    ...server,
    rewards: {
      stars: Math.max(server.rewards.stars, client.rewards.stars),
      coins: Math.max(server.rewards.coins, client.rewards.coins),
      badges: union(server.rewards.badges, client.rewards.badges),
      certificates: union(server.rewards.certificates, client.rewards.certificates),
    },
    mastery: { ...server.mastery, ...client.mastery },
    lessonsCompleted: union(server.lessonsCompleted, client.lessonsCompleted),
    storiesRead: union(server.storiesRead, client.storiesRead),
    unlockedLocations: union(server.unlockedLocations, client.unlockedLocations),
    decorations: union(server.decorations, client.decorations),
    assignments: { ...server.assignments, ...client.assignments },
    tickedAt: Math.max(server.tickedAt, client.tickedAt),
  };
}

export async function getWorld(db: Db, childId: string) {
  const [row] = await db.select().from(daduWorldStates).where(eq(daduWorldStates.childId, childId)).limit(1);
  return row ? { version: row.version, state: row.state as unknown as WorldState, updatedAt: row.updatedAt.toISOString() } : null;
}

export async function putWorld(db: Db, childId: string, clientVersion: number, state: WorldState) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(daduWorldStates).where(eq(daduWorldStates.childId, childId)).for('update').limit(1);
    if (!row) {
      const [inserted] = await tx.insert(daduWorldStates).values({ childId, state: state as unknown as Record<string, unknown>, version: 1 }).returning();
      return { conflict: false as const, version: inserted!.version, state };
    }
    if (clientVersion === row.version) {
      const [updated] = await tx
        .update(daduWorldStates)
        .set({ state: state as unknown as Record<string, unknown>, version: row.version + 1, updatedAt: new Date() })
        .where(eq(daduWorldStates.childId, childId))
        .returning();
      return { conflict: false as const, version: updated!.version, state };
    }
    const merged = mergeWorld(row.state as unknown as WorldState, state);
    const [updated] = await tx
      .update(daduWorldStates)
      .set({ state: merged as unknown as Record<string, unknown>, version: row.version + 1, updatedAt: new Date() })
      .where(eq(daduWorldStates.childId, childId))
      .returning();
    return { conflict: true as const, version: updated!.version, state: merged };
  });
}

// ---- progress and mastery --------------------------------------------------

function dayOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function recordProgress(db: Db, childId: string, events: ProgressEvent[]) {
  const accepted: string[] = [];
  const duplicates: string[] = [];
  const touched = new Set<string>();
  await db.transaction(async (tx) => {
    for (const e of events) {
      const inserted = await tx
        .insert(daduProgressEvents)
        .values({ childId, kind: e.kind, contentId: e.contentId, payload: e.payload, clientId: e.clientId, occurredAt: new Date(e.occurredAt) })
        .onConflictDoNothing({ target: daduProgressEvents.clientId })
        .returning({ id: daduProgressEvents.id });
      if (inserted.length === 0) {
        duplicates.push(e.clientId);
        continue;
      }
      accepted.push(e.clientId);
      const when = new Date(e.occurredAt);
      if (e.payload.concept && e.payload.result !== undefined) {
        const [prev] = await tx.select().from(daduMastery).where(and(eq(daduMastery.childId, childId), eq(daduMastery.concept, e.payload.concept))).for('update').limit(1);
        const next = updateMastery(prev ?? null, e.payload.result, e.payload.difficulty ?? 'steady', when);
        await tx
          .insert(daduMastery)
          .values({ childId, concept: e.payload.concept, ...next })
          .onConflictDoUpdate({ target: [daduMastery.childId, daduMastery.concept], set: { ...next } });
        touched.add(e.payload.concept);
      }
      if (e.payload.minutes) {
        await tx
          .insert(daduScreenTime)
          .values({ childId, day: dayOf(when), minutes: e.payload.minutes })
          .onConflictDoUpdate({ target: [daduScreenTime.childId, daduScreenTime.day], set: { minutes: sql`${daduScreenTime.minutes} + ${e.payload.minutes}` } });
      }
    }
  });
  const mastery = touched.size ? await db.select().from(daduMastery).where(and(eq(daduMastery.childId, childId), inArray(daduMastery.concept, [...touched]))) : [];
  return { accepted, duplicates, mastery: mastery.map(masteryView) };
}

export function masteryView(m: typeof daduMastery.$inferSelect) {
  const row: MasteryRow = { score: m.score, attempts: m.attempts, correct: m.correct, intervalDays: m.intervalDays, lastSeenAt: m.lastSeenAt, nextReviewAt: m.nextReviewAt };
  return {
    concept: m.concept,
    score: Number(m.score.toFixed(4)),
    attempts: m.attempts,
    correct: m.correct,
    state: masteryState(row),
    lastSeenAt: m.lastSeenAt.getTime(),
    nextReviewAt: m.nextReviewAt.getTime(),
  };
}

export async function listProgress(db: Db, childId: string, since: number, limit: number) {
  const rows = await db
    .select()
    .from(daduProgressEvents)
    .where(and(eq(daduProgressEvents.childId, childId), gt(daduProgressEvents.id, since)))
    .orderBy(asc(daduProgressEvents.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    items: page.map((r) => ({ id: r.id, clientId: r.clientId, kind: r.kind, contentId: r.contentId, payload: r.payload, occurredAt: r.occurredAt.toISOString() })),
    cursor: page.length ? String(page[page.length - 1]!.id) : String(since),
    hasMore: rows.length > limit,
  };
}

// ---- screen time -------------------------------------------------------------

export async function screenTime(db: Db, childId: string, days: number) {
  const from = new Date(Date.now() - (days - 1) * 86_400_000);
  const rows = await db
    .select()
    .from(daduScreenTime)
    .where(and(eq(daduScreenTime.childId, childId), gte(daduScreenTime.day, dayOf(from))))
    .orderBy(asc(daduScreenTime.day));
  const byDay = new Map(rows.map((r) => [r.day, r.minutes]));
  const out: { day: string; minutes: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = dayOf(new Date(from.getTime() + i * 86_400_000));
    out.push({ day: d, minutes: byDay.get(d) ?? 0 });
  }
  return out;
}

export async function screenRules(db: Db, childId: string) {
  const [row] = await db.select().from(daduScreenRules).where(eq(daduScreenRules.childId, childId)).limit(1);
  return row
    ? { dailyMinutes: row.dailyMinutes, bedtime: row.bedtime, breakEveryMinutes: row.breakEveryMinutes, updatedAt: row.updatedAt.toISOString() }
    : { dailyMinutes: null, bedtime: null, breakEveryMinutes: 20, updatedAt: null };
}

// ---- consent -----------------------------------------------------------------

export async function activeConsent(db: Db, userId: string, kind: 'processing' | 'photos' | 'analytics', childId?: string | null) {
  const rows = await db
    .select()
    .from(daduConsents)
    .where(and(eq(daduConsents.userId, userId), eq(daduConsents.kind, kind), isNull(daduConsents.withdrawnAt)))
    .orderBy(desc(daduConsents.grantedAt));
  return rows.find((c) => !c.childId || !childId || c.childId === childId) ?? null;
}

// ---- published content ---------------------------------------------------------

export async function publishedContent(db: Db, filters: { kind?: string; section?: string; language?: string; since?: Date; page: number; pageSize: number }) {
  const conds = [isNotNull(daduContentItems.publishedVersion)];
  if (filters.kind) conds.push(eq(daduContentItems.kind, filters.kind as typeof daduContentItems.$inferSelect.kind));
  if (filters.section) conds.push(eq(daduContentItems.section, filters.section));
  if (filters.language) conds.push(sql`${filters.language} = any(${daduContentItems.languages})`);
  if (filters.since) conds.push(gte(daduContentItems.updatedAt, filters.since));
  const where = and(...conds);
  const [total] = await db.select({ n: count() }).from(daduContentItems).where(where);
  const rows = await db
    .select({ item: daduContentItems, body: daduContentVersions.body, publishedAt: daduContentVersions.publishedAt })
    .from(daduContentItems)
    .innerJoin(daduContentVersions, and(eq(daduContentVersions.itemId, daduContentItems.id), eq(daduContentVersions.version, daduContentItems.publishedVersion)))
    .where(where)
    .orderBy(asc(daduContentItems.id))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);
  return { items: rows.map((r) => publishedView(r.item, r.body, r.publishedAt)), total: total?.n ?? 0, page: filters.page, pageSize: filters.pageSize };
}

export function publishedView(item: typeof daduContentItems.$inferSelect, body: Record<string, unknown>, publishedAt: Date | null) {
  return {
    id: item.id,
    kind: item.kind,
    section: item.section,
    subject: item.subject,
    topic: item.topic,
    bands: item.bands,
    difficulty: item.difficulty,
    languages: item.languages,
    rights: item.rights,
    version: item.publishedVersion,
    publishedAt: publishedAt?.toISOString() ?? null,
    body,
  };
}

export async function publishedItem(db: Db, id: string) {
  const [row] = await db
    .select({ item: daduContentItems, body: daduContentVersions.body, publishedAt: daduContentVersions.publishedAt })
    .from(daduContentItems)
    .innerJoin(daduContentVersions, and(eq(daduContentVersions.itemId, daduContentItems.id), eq(daduContentVersions.version, daduContentItems.publishedVersion)))
    .where(and(eq(daduContentItems.id, id), isNotNull(daduContentItems.publishedVersion)))
    .limit(1);
  return row ? publishedView(row.item, row.body, row.publishedAt) : null;
}

export async function catalogueSummary(db: Db) {
  const rows = await db
    .select({ kind: daduContentItems.kind, section: daduContentItems.section, n: count() })
    .from(daduContentItems)
    .where(isNotNull(daduContentItems.publishedVersion))
    .groupBy(daduContentItems.kind, daduContentItems.section);
  const byKind: Record<string, number> = {};
  const bySection: Record<string, number> = {};
  for (const r of rows) {
    byKind[r.kind] = (byKind[r.kind] ?? 0) + r.n;
    if (r.section) bySection[r.section] = (bySection[r.section] ?? 0) + r.n;
  }
  return { byKind, bySection, total: rows.reduce((a, r) => a + r.n, 0) };
}

/** Honest coverage: share of published lessons and stories that carry each language. */
export async function languageCoverage(db: Db) {
  const rows = await db
    .select({ languages: daduContentItems.languages })
    .from(daduContentItems)
    .where(and(isNotNull(daduContentItems.publishedVersion), inArray(daduContentItems.kind, ['lesson', 'story'])));
  const out: Record<string, number> = {};
  for (const l of LANGS) out[l] = rows.length ? rows.filter((r) => r.languages.includes(l)).length / rows.length : 0;
  return out;
}

export async function featureFlags(db: Db) {
  const rows = await db.select().from(daduFeatureFlags);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function publishedPacks(db: Db, language?: string) {
  const conds = [eq(daduPacks.status, 'published')];
  if (language) conds.push(sql`(${daduPacks.language} is null or ${daduPacks.language} = ${language})`);
  const rows = await db.select().from(daduPacks).where(and(...conds)).orderBy(desc(daduPacks.publishedAt));
  // only the newest published version per (kind, language)
  const seen = new Set<string>();
  return rows
    .filter((r) => {
      const k = `${r.kind}:${r.language ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map(packView);
}

export function packView(p: typeof daduPacks.$inferSelect) {
  const m = p.manifest as { items?: unknown[] };
  return { id: p.id, kind: p.kind, language: p.language, version: p.version, bytes: p.bytes, sha256: p.sha256, status: p.status, itemCount: Array.isArray(m.items) ? m.items.length : 0, publishedAt: p.publishedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString() };
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Assemble a pack manifest from published items. */
export async function buildPackManifest(db: Db, kind: typeof daduPacks.$inferSelect.kind, language: string | null) {
  const conds = [isNotNull(daduContentItems.publishedVersion)];
  if (kind === 'stories') conds.push(eq(daduContentItems.kind, 'story'));
  if (kind === 'core') conds.push(inArray(daduContentItems.kind, ['character', 'location', 'object']));
  if (kind === 'language' && language) conds.push(sql`${language} = any(${daduContentItems.languages})`);
  const rows = await db
    .select({ id: daduContentItems.id, kind: daduContentItems.kind, section: daduContentItems.section, version: daduContentItems.publishedVersion, body: daduContentVersions.body })
    .from(daduContentItems)
    .innerJoin(daduContentVersions, and(eq(daduContentVersions.itemId, daduContentItems.id), eq(daduContentVersions.version, daduContentItems.publishedVersion)))
    .where(and(...conds))
    .orderBy(asc(daduContentItems.id));
  const items = rows.map((r) => {
    const json = JSON.stringify(r.body);
    return { id: r.id, kind: r.kind, section: r.section, version: r.version, bytes: Buffer.byteLength(json), sha256: sha256(json) };
  });
  const manifest = { kind, language, items, builtAt: new Date().toISOString() };
  const json = JSON.stringify(manifest);
  return { manifest, bytes: items.reduce((a, i) => a + i.bytes, 0), sha256: sha256(json) };
}

// ---- parent summary --------------------------------------------------------------

export async function childSummary(db: Db, childId: string) {
  const world = await getWorld(db, childId);
  const state = world?.state;
  const completed = state?.lessonsCompleted ?? [];
  const sectionOf = new Map<string, string>();
  if (completed.length) {
    const rows = await db.select({ id: daduContentItems.id, section: daduContentItems.section }).from(daduContentItems).where(inArray(daduContentItems.id, completed));
    for (const r of rows) if (r.section) sectionOf.set(r.id, r.section);
  }
  const bySection: Record<string, number> = {};
  for (const id of completed) {
    const s = sectionOf.get(id) ?? id.split('.')[0] ?? 'other';
    bySection[s] = (bySection[s] ?? 0) + 1;
  }
  const mastery = await db.select().from(daduMastery).where(eq(daduMastery.childId, childId));
  const buckets: Record<string, number> = { new: 0, exploring: 0, growing: 0, nearly: 0, mastered: 0, revise: 0 };
  const revise: string[] = [];
  for (const m of mastery) {
    const v = masteryView(m);
    buckets[v.state] = (buckets[v.state] ?? 0) + 1;
    if (v.state === 'revise' || v.state === 'growing') revise.push(v.concept);
  }
  const [assignments] = await db.select({ n: count() }).from(daduAssignmentCompletions).where(eq(daduAssignmentCompletions.childId, childId));
  return {
    lessonsCompleted: completed.length,
    lessonsBySection: bySection,
    storiesRead: state?.storiesRead.length ?? 0,
    assignmentsCompleted: assignments?.n ?? 0,
    rewards: state?.rewards ?? { stars: 0, coins: 0, badges: [], certificates: [] },
    mastery: { buckets, needsPractice: revise.slice(0, 10), total: mastery.length },
    screenTime: await screenTime(db, childId, 7),
    rules: await screenRules(db, childId),
    worldVersion: world?.version ?? 0,
  };
}
