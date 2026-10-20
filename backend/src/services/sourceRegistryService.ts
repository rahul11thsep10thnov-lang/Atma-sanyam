// SourceRegistryService: keeps the "Did You Know?" source list populated and
// honest.
//
//   seed        inserts the registry (catalogue/sourceRegistry.ts) into
//               fact_sources — the same table the console's "Add a source"
//               form writes — without duplicates and without touching anything
//               an administrator edited;
//   verify      fetches each source's licence evidence and decides its status
//               from what the page actually says (never from reachability);
//   maintain    runs verification on a schedule, detects changed or missing
//               licence evidence, suspends ingestion when a licence becomes
//               uncertain, and records everything in source_verification_events;
//   discover    registers extra candidate sources from configured feeds as
//               'pending_review' (never approved automatically).
//
// Nothing here deletes a source or a fact.
import { createHash } from 'node:crypto';
import { and, asc, count, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../database/client.js';
import { factSources, facts, sourceVerificationEvents, type SourceVerificationStatus } from '../database/schema.js';
import { SOURCE_REGISTRY, type RegistrySource } from '../catalogue/sourceRegistry.js';
import type { Env } from '../config/env.js';
import { canonicalizeUrl, hostOf } from '../lib/url.js';
import { SafeFetchError, safeFetchText, type RobotsRules } from '../lib/safeFetch.js';

export type SourceRow = typeof factSources.$inferSelect;
export type Trigger = 'seed' | 'startup' | 'scheduled' | 'manual' | 'discovery' | 'ingest';

export const REGISTRY_BY_KEY = new Map(SOURCE_REGISTRY.map((s) => [s.key, s]));

// ---------------------------------------------------------------------------
// Runtime (injectable so tests never touch the network)
// ---------------------------------------------------------------------------
export interface RegistryRuntime {
  fetchImpl?: typeof fetch;
  resolve?: (host: string) => Promise<string[]>;
  sleep?: (ms: number) => Promise<void>;
  now: () => Date;
  userAgent: string;
  timeoutMs: number;
  retries: number;
  minIntervalMs: number;
  maxChecks: number;
  checkIntervalMs: number;
  discovery: { feeds: string[]; allowedDomains: string[]; maxPerRun: number };
  log: (msg: string) => void;
}

export function runtimeFromEnv(env: Env, overrides: Partial<RegistryRuntime> = {}): RegistryRuntime {
  return {
    now: () => new Date(),
    userAgent: `LoJiSourceBot/1.0 (educational app; contact: ${env.SOURCE_BOT_CONTACT ?? 'not configured'})`,
    timeoutMs: env.SOURCE_FETCH_TIMEOUT_MS,
    retries: env.SOURCE_FETCH_RETRIES,
    minIntervalMs: env.SOURCE_MIN_REQUEST_INTERVAL_MS,
    maxChecks: env.SOURCE_MAX_CHECKS_PER_RUN,
    checkIntervalMs: env.SOURCE_CHECK_INTERVAL_HOURS * 3_600_000,
    discovery: { feeds: env.SOURCE_DISCOVERY_FEEDS, allowedDomains: env.SOURCE_DISCOVERY_ALLOWED_DOMAINS, maxPerRun: env.SOURCE_DISCOVERY_MAX_PER_RUN },
    log: (m) => console.log(`[sources] ${m}`),
    ...overrides,
  };
}

const MAX_BYTES = 2_000_000;

/** Hosts the registry may fetch: every registry source/evidence host, plus configured discovery domains. */
export function buildHostAllowed(extraDomains: string[] = []) {
  const exact = new Set<string>();
  for (const s of SOURCE_REGISTRY) {
    for (const u of [s.url, s.evidenceUrl]) {
      const h = hostOf(u);
      if (h) exact.add(h);
    }
  }
  const suffixes = extraDomains.map((d) => d.toLowerCase().replace(/^\./, '')).filter(Boolean);
  return (host: string) => exact.has(host) || suffixes.some((d) => host === d || host.endsWith(`.${d}`));
}

function fetchOptions(rt: RegistryRuntime, robotsCache: Map<string, RobotsRules | 'unavailable'>, hostAllowed = buildHostAllowed(rt.discovery.allowedDomains)) {
  return {
    userAgent: rt.userAgent,
    timeoutMs: rt.timeoutMs,
    maxBytes: MAX_BYTES,
    retries: rt.retries,
    hostAllowed,
    fetchImpl: rt.fetchImpl,
    resolve: rt.resolve,
    sleep: rt.sleep,
    respectRobots: true,
    robotsCache,
  };
}

// ---------------------------------------------------------------------------
// Notes: a human-readable block (editable) + a machine-managed validation line
// ---------------------------------------------------------------------------
const VALIDATION = '[Validation]';

export function buildNotes(e: RegistrySource): string {
  const yn = (v: boolean | null) => (v === null ? 'unknown' : v ? 'yes' : 'no');
  return [
    `Registry source (${e.group.replace('_', ' ')}; ${e.kind}).`,
    `Subjects: ${e.topics.length ? e.topics.join(', ') : 'n/a'}.`,
    e.endpoint ? `Endpoint: ${e.endpoint}.` : null,
    `Expected licence (a claim until verified): ${e.claim.licenceName} — ${e.claim.licenceUrl}.`,
    `Commercial use: ${yn(e.claim.commercial)}; redistribution: ${yn(e.claim.redistribution)}; attribution required: ${yn(e.claim.attribution)}; share-alike: ${yn(e.claim.shareAlike)}; API key: ${yn(e.claim.apiKey)}.`,
    `Permitted content types (expected): ${e.claim.contentTypes.length ? e.claim.contentTypes.join(', ') : 'none'}.`,
    `Rate limits: ${e.claim.rateLimit}`,
    `Languages: ${e.languages.join(', ')}.`,
    `Caveat: ${e.caveat}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Replaces (or appends) the machine-managed validation line, leaving everything else as the admin wrote it. */
export function withValidation(notes: string | null, line: string): string {
  const base = (notes ?? '').split(`\n\n${VALIDATION}`)[0]!.trimEnd();
  return `${base}${base ? '\n\n' : ''}${VALIDATION} ${line}`;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

async function logEvent(db: Db, sourceId: string, trigger: Trigger, outcome: string, from: string | null, to: string | null, detail?: string) {
  await db.insert(sourceVerificationEvents).values({ sourceId, trigger, outcome, fromStatus: from, toStatus: to, detail: detail ? detail.slice(0, 500) : null });
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------
function registryColumns(e: RegistrySource) {
  return {
    publisher: e.publisher,
    title: e.title,
    url: e.url,
    canonicalUrl: canonicalizeUrl(e.url),
    connector: e.connector ?? null,
    attributionTemplate: e.attributionTemplate ?? null,
    licenceName: e.claim.licenceName,
    licenceUrl: e.claim.licenceUrl,
    commercialUseAllowed: e.claim.commercial,
    redistributionAllowed: e.claim.redistribution,
    attributionRequired: e.claim.attribution,
    shareAlikeRequired: e.claim.shareAlike,
    apiKeyRequired: e.claim.apiKey,
    rateLimitNotes: e.claim.rateLimit,
    contentTypesAllowed: e.claim.contentTypes,
    verificationEvidenceUrl: e.evidenceUrl,
  };
}

export interface SeedResult {
  inserted: number;
  attached: number;
  refreshed: number;
  backfilled: number;
  unchanged: number;
}

/** Idempotent. Safe to run at every start, in migrations and from tests. */
export async function seedSourceRegistry(db: Db, entries: RegistrySource[] = SOURCE_REGISTRY, trigger: Trigger = 'seed'): Promise<SeedResult> {
  const out: SeedResult = { inserted: 0, attached: 0, refreshed: 0, backfilled: 0, unchanged: 0 };

  // Legacy rows (created before canonical urls existed) get one now, unless it
  // would collide with another row, in which case they are left alone.
  const legacy = await db.select().from(factSources).where(isNull(factSources.canonicalUrl));
  for (const row of legacy) {
    const c = canonicalizeUrl(row.url);
    if (!c) continue;
    const clash = await db.select({ id: factSources.id }).from(factSources).where(eq(factSources.canonicalUrl, c)).limit(1);
    if (clash.length) continue;
    await db.update(factSources).set({ canonicalUrl: c }).where(eq(factSources.id, row.id));
    out.backfilled++;
  }

  for (const e of entries) {
    const canonical = canonicalizeUrl(e.url)!;
    const [existing] = await db
      .select()
      .from(factSources)
      .where(or(eq(factSources.sourceKey, e.key), eq(factSources.canonicalUrl, canonical)))
      .orderBy(asc(factSources.createdAt))
      .limit(1);

    if (!existing) {
      // documentation and per-item-licence entries are excluded from fact
      // generation by policy; content sources wait for evidence.
      const status: SourceVerificationStatus = e.kind === 'content' ? 'pending_review' : 'restricted';
      const [row] = await db
        .insert(factSources)
        .values({ ...registryColumns(e), sourceKey: e.key, origin: 'registry', notes: withValidation(buildNotes(e), e.kind === 'content' ? 'pending_review — licence evidence has not been checked yet; not used for facts until it is.' : `restricted — ${e.caveat}`), verificationStatus: status, licenceVerified: false })
        .onConflictDoNothing()
        .returning({ id: factSources.id });
      if (row) {
        await logEvent(db, row.id, trigger, 'seeded', null, status);
        out.inserted++;
      } else out.unchanged++;
      continue;
    }

    if (!existing.sourceKey) {
      // The same URL was already registered by hand (or by the editorial
      // seeds). Adopt it: attach the key and fill only EMPTY claim columns.
      const fill: Partial<typeof factSources.$inferInsert> = { sourceKey: e.key, updatedAt: new Date() };
      const c = registryColumns(e);
      if (!existing.licenceName) fill.licenceName = c.licenceName;
      if (!existing.licenceUrl) fill.licenceUrl = c.licenceUrl;
      if (!existing.connector) fill.connector = c.connector;
      if (!existing.attributionTemplate) fill.attributionTemplate = c.attributionTemplate;
      if (existing.contentTypesAllowed.length === 0) fill.contentTypesAllowed = c.contentTypesAllowed;
      if (!existing.verificationEvidenceUrl) fill.verificationEvidenceUrl = c.verificationEvidenceUrl;
      if (existing.rateLimitNotes === null) fill.rateLimitNotes = c.rateLimitNotes;
      await db.update(factSources).set(fill).where(eq(factSources.id, existing.id));
      await logEvent(db, existing.id, trigger, 'seeded', existing.verificationStatus, existing.verificationStatus, 'Adopted an existing record; wording left untouched');
      out.attached++;
      continue;
    }

    // Registry-managed and untouched by any administrator: keep the
    // descriptive fields current. Verified licences are never overwritten.
    if (existing.origin === 'registry' && !existing.adminEdited && !existing.licenceVerified) {
      const next = { ...registryColumns(e), notes: withValidation(buildNotes(e), (existing.notes ?? '').split(`\n\n${VALIDATION} `)[1] ?? 'pending_review') };
      const changed = (['publisher', 'title', 'url', 'licenceName', 'licenceUrl', 'rateLimitNotes', 'connector', 'attributionTemplate'] as const).some((k) => (next[k] ?? null) !== (existing[k] ?? null)) || next.notes !== existing.notes || JSON.stringify(next.contentTypesAllowed) !== JSON.stringify(existing.contentTypesAllowed);
      if (changed) {
        await db.update(factSources).set({ ...next, updatedAt: new Date() }).where(eq(factSources.id, existing.id));
        out.refreshed++;
        continue;
      }
    }
    out.unchanged++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** A fingerprint of the sentences around each marker: changes when the licence wording changes, not when the page chrome does. */
function evidenceFingerprint(text: string, markers: string[]): string | null {
  const parts: string[] = [];
  for (const m of markers) {
    const i = text.indexOf(m.toLowerCase());
    if (i < 0) return null;
    parts.push(text.slice(Math.max(0, i - 160), i + m.length + 160));
  }
  return parts.length ? sha(parts.join('|')) : null;
}

export interface VerifyResult {
  sourceId: string;
  key: string | null;
  from: SourceVerificationStatus;
  to: SourceVerificationStatus;
  outcome: 'verified' | 'unchanged' | 'failed' | 'suspended' | 'resumed' | 'skipped';
  detail: string;
}

const TRANSIENT_FAILURES_BEFORE_UNAVAILABLE = 5;

export async function verifySource(db: Db, source: SourceRow, rt: RegistryRuntime, trigger: Trigger, robotsCache: Map<string, RobotsRules | 'unavailable'> = new Map()): Promise<VerifyResult> {
  const now = rt.now();
  const from = source.verificationStatus;
  const entry = source.sourceKey ? REGISTRY_BY_KEY.get(source.sourceKey) : undefined;
  const result = (to: SourceVerificationStatus, outcome: VerifyResult['outcome'], detail: string): VerifyResult => ({ sourceId: source.id, key: source.sourceKey, from, to, outcome, detail });

  if (!entry) {
    return result(from, 'skipped', 'This source has no automatic licence rules; a person must review it.');
  }

  // Documentation and per-item-licence entries are excluded by policy.
  if (entry.kind !== 'content') {
    if (!source.statusLocked && from !== 'restricted') {
      await db.update(factSources).set({ verificationStatus: 'restricted', lastCheckedAt: now, updatedAt: now, notes: withValidation(source.notes, `restricted — ${entry.caveat}`) }).where(eq(factSources.id, source.id));
      await logEvent(db, source.id, trigger, 'verified', from, 'restricted', 'Excluded by policy (documentation or per-item licences)');
      return result('restricted', 'verified', 'Excluded by policy');
    }
    await db.update(factSources).set({ lastCheckedAt: now }).where(eq(factSources.id, source.id));
    return result(from, 'unchanged', 'Excluded by policy');
  }

  // ---- fetch the licence evidence --------------------------------------------
  let body: { status: number; text: string; finalUrl: string };
  try {
    body = await safeFetchText(entry.evidenceUrl, fetchOptions(rt, robotsCache));
  } catch (err) {
    return recordFailure(db, source, from, trigger, now, err);
  }
  if (body.status >= 400) {
    return recordFailure(db, source, from, trigger, now, new SafeFetchError('http', `HTTP ${body.status}`, body.status));
  }

  // ---- decide from what the page says -----------------------------------------
  const text = htmlToText(body.text).toLowerCase();
  const restrictHit = entry.restrictMarkers.find((m) => text.includes(m.toLowerCase()));
  const approveAll = entry.approveMarkers.length > 0 && entry.approveMarkers.every((m) => text.includes(m.toLowerCase()));
  const fingerprint = approveAll ? evidenceFingerprint(text, entry.approveMarkers) : null;

  let target: SourceVerificationStatus;
  let reason: string;
  if (restrictHit) {
    target = 'restricted';
    reason = `restrictive term found on the evidence page: "${restrictHit}"`;
  } else if (approveAll && entry.autoApprove) {
    target = 'approved';
    reason = `licence evidence found (${entry.approveMarkers.map((m) => `"${m}"`).join(', ')}) at ${body.finalUrl}`;
  } else if (approveAll) {
    target = 'pending_review';
    reason = 'licence wording found, but this source has mixed or per-item licences, so a person must approve it';
  } else {
    target = 'pending_review';
    reason = 'the expected licence wording was not found on the evidence page';
  }

  // An administrator's decision is never overridden: record the check only.
  if (source.statusLocked) {
    await db.update(factSources).set({ lastCheckedAt: now, accessedOn: day(now), evidenceHash: fingerprint ?? source.evidenceHash, lastCheckError: null, consecutiveFailures: 0, updatedAt: now, notes: withValidation(source.notes, `status locked by an administrator (${from}); automated result would be ${target}: ${reason}.`) }).where(eq(factSources.id, source.id));
    await logEvent(db, source.id, trigger, 'unchanged', from, from, `Locked; automated result ${target}: ${reason}`);
    return result(from, 'unchanged', `Locked by an administrator; automated result would be ${target}`);
  }

  const wasApproved = from === 'approved' && source.licenceVerified;
  const hashChanged = !!(fingerprint && source.evidenceHash && fingerprint !== source.evidenceHash);
  const base = { lastCheckedAt: now, accessedOn: day(now), lastCheckError: null as string | null, consecutiveFailures: 0, verificationEvidenceUrl: body.finalUrl, updatedAt: now };

  if (target === 'approved') {
    const resumed = source.ingestionSuspended && (source.suspensionReason ?? '').startsWith('auto:');
    await db
      .update(factSources)
      .set({
        ...base,
        verificationStatus: 'approved',
        licenceVerified: true,
        commercialUseAllowed: entry.claim.commercial,
        redistributionAllowed: entry.claim.redistribution,
        attributionRequired: entry.claim.attribution,
        shareAlikeRequired: entry.claim.shareAlike,
        lastVerifiedAt: now,
        evidenceHash: fingerprint,
        evidenceChangedAt: hashChanged ? now : source.evidenceChangedAt,
        ingestionSuspended: resumed ? false : source.ingestionSuspended,
        suspensionReason: resumed ? null : source.suspensionReason,
        notes: withValidation(source.notes, `approved on ${day(now)} — ${reason}${hashChanged ? '. NOTE: the licence wording changed since the last check; review it.' : '.'}`),
      })
      .where(eq(factSources.id, source.id));
    const outcome = resumed ? 'resumed' : 'verified';
    await logEvent(db, source.id, trigger, outcome, from, 'approved', reason + (hashChanged ? ' (wording changed)' : ''));
    return result('approved', outcome, reason);
  }

  if (target === 'restricted') {
    await db
      .update(factSources)
      .set({ ...base, verificationStatus: 'restricted', licenceVerified: true, commercialUseAllowed: false, lastVerifiedAt: now, ingestionSuspended: true, suspensionReason: `auto: ${reason}`, evidenceChangedAt: wasApproved ? now : source.evidenceChangedAt, notes: withValidation(source.notes, `restricted on ${day(now)} — ${reason}.`) })
      .where(eq(factSources.id, source.id));
    await logEvent(db, source.id, trigger, wasApproved ? 'suspended' : 'verified', from, 'restricted', reason);
    return result('restricted', wasApproved ? 'suspended' : 'verified', reason);
  }

  // pending_review
  if (wasApproved) {
    // Licence became uncertain: stop new ingestion, keep what we have, flag it.
    await db
      .update(factSources)
      .set({ ...base, verificationStatus: 'pending_review', ingestionSuspended: true, suspensionReason: `auto: ${reason}`, evidenceChangedAt: now, notes: withValidation(source.notes, `licence uncertain since ${day(now)} — ${reason}. New ingestion suspended; stored facts kept.`) })
      .where(eq(factSources.id, source.id));
    await logEvent(db, source.id, trigger, 'suspended', from, 'pending_review', reason);
    return result('pending_review', 'suspended', reason);
  }
  await db
    .update(factSources)
    .set({ ...base, verificationStatus: 'pending_review', licenceVerified: false, notes: withValidation(source.notes, `pending_review — ${reason}. Not used for facts until a person approves it.`) })
    .where(eq(factSources.id, source.id));
  await logEvent(db, source.id, trigger, 'unchanged', from, 'pending_review', reason);
  return result('pending_review', 'unchanged', reason);
}

async function recordFailure(db: Db, source: SourceRow, from: SourceVerificationStatus, trigger: Trigger, now: Date, err: unknown): Promise<VerifyResult> {
  const e = err instanceof SafeFetchError ? err : new SafeFetchError('network', 'Unexpected error');
  const message = `${e.kind}: ${e.message}`.slice(0, 300);
  const failures = source.consecutiveFailures + 1;
  const gone = e.kind === 'http' && (e.status === 404 || e.status === 410);
  const wasApproved = from === 'approved' && source.licenceVerified;
  let to: SourceVerificationStatus = from;
  let suspend: { ingestionSuspended: boolean; suspensionReason: string | null } = { ingestionSuspended: source.ingestionSuspended, suspensionReason: source.suspensionReason };
  if (!source.statusLocked) {
    if (gone) {
      to = 'unavailable';
      if (wasApproved) suspend = { ingestionSuspended: true, suspensionReason: `auto: licence evidence page is gone (${message})` };
    } else if (wasApproved) {
      if (failures >= TRANSIENT_FAILURES_BEFORE_UNAVAILABLE) to = 'unavailable';
    } else if (from === 'pending_review' || from === 'verification_failed' || from === 'unavailable') {
      to = failures >= TRANSIENT_FAILURES_BEFORE_UNAVAILABLE ? 'unavailable' : 'verification_failed';
    }
  }
  await db
    .update(factSources)
    .set({ lastCheckedAt: now, lastCheckError: message, consecutiveFailures: failures, verificationStatus: to, ...suspend, updatedAt: now, notes: withValidation(source.notes, `${to} — last check failed on ${day(now)}: ${message}.`) })
    .where(eq(factSources.id, source.id));
  await logEvent(db, source.id, trigger, 'failed', from, to, message);
  return { sourceId: source.id, key: source.sourceKey, from, to, outcome: 'failed', detail: message };
}

// ---------------------------------------------------------------------------
// Maintenance (scheduled), manual verification, discovery
// ---------------------------------------------------------------------------
export interface MaintenanceReport {
  trigger: Trigger;
  seeded: SeedResult;
  checked: number;
  approved: number;
  restricted: number;
  pending: number;
  failed: number;
  suspended: number;
  discovered: number;
  errors: { key: string | null; detail: string }[];
}

export async function runMaintenance(db: Db, rt: RegistryRuntime, opts: { trigger: Trigger; force?: boolean }): Promise<MaintenanceReport> {
  const seeded = await seedSourceRegistry(db, SOURCE_REGISTRY, opts.trigger);
  const now = rt.now();
  const cutoff = new Date(now.getTime() - rt.checkIntervalMs);
  const due = await db
    .select()
    .from(factSources)
    .where(and(sql`${factSources.sourceKey} is not null`, opts.force ? undefined : or(isNull(factSources.lastCheckedAt), sql`${factSources.lastCheckedAt} < ${cutoff}`)))
    .orderBy(sql`${factSources.lastCheckedAt} asc nulls first`)
    .limit(rt.maxChecks);

  const report: MaintenanceReport = { trigger: opts.trigger, seeded, checked: 0, approved: 0, restricted: 0, pending: 0, failed: 0, suspended: 0, discovered: 0, errors: [] };
  const robotsCache = new Map<string, RobotsRules | 'unavailable'>();
  const lastRequest = new Map<string, number>();
  const sleep = rt.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  for (const source of due) {
    try {
      const entry = source.sourceKey ? REGISTRY_BY_KEY.get(source.sourceKey) : undefined;
      if (entry?.kind === 'content') {
        // Be polite: space requests to the same host.
        const host = hostOf(entry.evidenceUrl) ?? '';
        const wait = (lastRequest.get(host) ?? 0) + rt.minIntervalMs - Date.now();
        if (wait > 0) await sleep(wait);
        lastRequest.set(host, Date.now());
      }
      const r = await verifySource(db, source, rt, opts.trigger, robotsCache);
      report.checked++;
      if (r.outcome === 'failed') {
        report.failed++;
        report.errors.push({ key: r.key, detail: r.detail });
      }
      if (r.outcome === 'suspended') report.suspended++;
      if (r.to === 'approved') report.approved++;
      else if (r.to === 'restricted') report.restricted++;
      else if (r.to === 'pending_review') report.pending++;
    } catch (err) {
      // One broken source must never stop the run.
      report.failed++;
      report.errors.push({ key: source.sourceKey, detail: err instanceof Error ? err.message.slice(0, 200) : 'unexpected error' });
      rt.log(`check failed for ${source.sourceKey}: ${err instanceof Error ? err.message : 'unexpected error'}`);
    }
  }
  report.discovered = (await discoverCandidates(db, rt, robotsCache).catch((err) => {
    rt.log(`discovery failed: ${err instanceof Error ? err.message : 'unexpected error'}`);
    return { registered: 0 };
  })).registered;
  rt.log(`${opts.trigger}: checked ${report.checked}, approved ${report.approved}, restricted ${report.restricted}, pending ${report.pending}, failed ${report.failed}, discovered ${report.discovered}`);
  return report;
}

/** Manual "Verify now" for one source. */
export async function verifyNow(db: Db, sourceId: string, rt: RegistryRuntime): Promise<VerifyResult | null> {
  const [source] = await db.select().from(factSources).where(eq(factSources.id, sourceId));
  if (!source) return null;
  return verifySource(db, source, rt, 'manual');
}

const feedItem = z.object({
  publisher: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(500),
  notes: z.string().trim().max(500).optional(),
});

/** Registers candidates from configured feeds. Never approves anything. */
export async function discoverCandidates(db: Db, rt: RegistryRuntime, robotsCache: Map<string, RobotsRules | 'unavailable'> = new Map()): Promise<{ registered: number; rejected: number }> {
  const { feeds, allowedDomains, maxPerRun } = rt.discovery;
  let registered = 0;
  let rejected = 0;
  if (feeds.length === 0 || maxPerRun === 0 || allowedDomains.length === 0) return { registered, rejected };
  const allowed = buildHostAllowed(allowedDomains);
  for (const feed of feeds) {
    if (registered >= maxPerRun) break;
    let items: unknown;
    try {
      const res = await safeFetchText(feed, { ...fetchOptions(rt, robotsCache, allowed), accept: 'application/json' });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      items = JSON.parse(res.text);
    } catch (err) {
      rt.log(`discovery feed unavailable (${hostOf(feed)}): ${err instanceof Error ? err.message : 'error'}`);
      continue;
    }
    for (const raw of Array.isArray(items) ? items : []) {
      if (registered >= maxPerRun) break;
      const parsed = feedItem.safeParse(raw);
      const canonical = parsed.success ? canonicalizeUrl(parsed.data.url) : null;
      const host = canonical ? hostOf(canonical) : null;
      // Only https URLs on reputable, explicitly allowed domains.
      if (!parsed.success || !canonical || !host || !allowed(host) || !parsed.data.url.startsWith('https://')) {
        rejected++;
        continue;
      }
      const [row] = await db
        .insert(factSources)
        .values({ publisher: parsed.data.publisher, title: parsed.data.title, url: parsed.data.url, canonicalUrl: canonical, origin: 'discovered', verificationStatus: 'pending_review', notes: withValidation(`Discovered through a configured feed (${hostOf(feed)}). ${parsed.data.notes ?? ''}`.trim(), 'pending_review — newly discovered; licence not reviewed. Not used for facts.') })
        .onConflictDoNothing()
        .returning({ id: factSources.id });
      if (row) {
        await logEvent(db, row.id, 'discovery', 'seeded', null, 'pending_review', `Feed ${hostOf(feed)}`);
        registered++;
      }
    }
  }
  return { registered, rejected };
}

// ---------------------------------------------------------------------------
// Gates: what a source may be used for
// ---------------------------------------------------------------------------
/** New facts may be ingested from this source. */
export function canIngestFrom(s: Pick<SourceRow, 'verificationStatus' | 'licenceVerified' | 'ingestionSuspended' | 'contentTypesAllowed'>, contentType = 'text'): boolean {
  return s.verificationStatus === 'approved' && s.licenceVerified && !s.ingestionSuspended && s.contentTypesAllowed.includes(contentType);
}

/** Facts already ingested from this source may be shown to children. Stored facts survive a temporary outage or an uncertain licence; a restricted source hides them. */
export function mayDeliverIngested(s: Pick<SourceRow, 'verificationStatus' | 'licenceVerified'> | undefined): boolean {
  return !!s && s.licenceVerified && s.verificationStatus !== 'restricted';
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------
export async function listSourcesWithStats(db: Db) {
  const rows = await db.select().from(factSources).orderBy(asc(factSources.publisher), asc(factSources.title));
  const counts = await db
    .select({ sourceId: facts.sourceId, total: count(), published: sql<number>`count(*) filter (where ${facts.status} = 'published')::int`, ingested: sql<number>`count(*) filter (where ${facts.ingestionKind} = 'ingested')::int` })
    .from(facts)
    .groupBy(facts.sourceId);
  const byId = new Map(counts.map((c) => [c.sourceId, c]));
  return rows.map((s) => ({ ...s, factCount: byId.get(s.id)?.total ?? 0, publishedFactCount: byId.get(s.id)?.published ?? 0, ingestedFactCount: byId.get(s.id)?.ingested ?? 0 }));
}

export async function sourceSummary(db: Db) {
  const rows = await db.select().from(factSources);
  // Registry-managed = carries a registry key (including existing records the registry adopted) or was discovered.
  const registryManaged = rows.filter((r) => r.sourceKey !== null || r.origin === 'discovered');
  const by = (st: SourceVerificationStatus) => rows.filter((r) => r.verificationStatus === st).length;
  const reviewable = rows.filter((r) => r.origin !== 'editorial' || r.sourceKey !== null);
  const lastOk = rows.map((r) => r.lastVerifiedAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const week = new Date(Date.now() - 7 * 86_400_000);
  return {
    total: rows.length,
    registeredAutomatically: registryManaged.length,
    approved: by('approved'),
    awaitingReview: reviewable.filter((r) => r.verificationStatus === 'pending_review').length,
    restricted: by('restricted'),
    unavailable: by('unavailable'),
    verificationFailed: by('verification_failed'),
    suspended: rows.filter((r) => r.ingestionSuspended).length,
    newlyDiscovered: rows.filter((r) => r.origin === 'discovered' && r.createdAt > week).length,
    lastSuccessfulVerificationAt: lastOk?.toISOString() ?? null,
    errors: rows
      .filter((r) => r.lastCheckError)
      .sort((a, b) => (b.lastCheckedAt?.getTime() ?? 0) - (a.lastCheckedAt?.getTime() ?? 0))
      .slice(0, 10)
      .map((r) => ({ id: r.id, title: r.title, publisher: r.publisher, error: r.lastCheckError, at: r.lastCheckedAt?.toISOString() ?? null, failures: r.consecutiveFailures })),
  };
}

export async function recentSourceEvents(db: Db, sourceId: string, limit = 30) {
  return db.select().from(sourceVerificationEvents).where(eq(sourceVerificationEvents.sourceId, sourceId)).orderBy(desc(sourceVerificationEvents.at)).limit(limit);
}

