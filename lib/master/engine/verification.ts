import type { Confidence } from "../enums";
import { VERIFICATION_INTERVAL_DAYS } from "../enums";
import { STATABLE_CONFIDENCE, frequencyForFactType } from "../policy";
import type { ConflictRecord, FactRecord, MasterDatabase, SourceRecord } from "../types";

/**
 * Verification, staleness and conflict handling (spec sections 35, 52, 53).
 * Rules: a fact is only ever stated as fact once VERIFIED / PROVISIONALLY_VERIFIED /
 * MULTIPLE_SOURCES; disagreeing sources create a conflict for an admin — nothing is auto-resolved.
 */

export type FactHealth = "PENDING_VERIFICATION" | "FRESH" | "DUE_SOON" | "STALE" | "CONFLICTING";

const DAY = 86_400_000;

export function canStateAsFact(confidence: Confidence): boolean {
  return STATABLE_CONFIDENCE.has(confidence);
}

export interface FactAssessment {
  fact: FactRecord;
  health: FactHealth;
  days_until_expiry: number | null;
}

export function assessFact(fact: FactRecord, now: Date = new Date()): FactAssessment {
  if (fact.confidence === "CONFLICTING") return { fact, health: "CONFLICTING", days_until_expiry: null };
  if (!fact.verified_at) return { fact, health: "PENDING_VERIFICATION", days_until_expiry: null };

  const interval = VERIFICATION_INTERVAL_DAYS[fact.verification_frequency ?? frequencyForFactType(fact.fact_type)];
  const expires = fact.expires_at ? new Date(fact.expires_at).getTime() : new Date(fact.verified_at).getTime() + interval * DAY;
  const left = Math.floor((expires - now.getTime()) / DAY);
  const health: FactHealth = left < 0 ? "STALE" : left <= Math.max(3, Math.round(interval * 0.1)) ? "DUE_SOON" : "FRESH";
  return { fact, health, days_until_expiry: left };
}

export function assessAll(db: MasterDatabase, now: Date = new Date()): FactAssessment[] {
  return db.facts.map((f) => assessFact(f, now));
}

/** Verified facts past their expiry — the site should stop presenting these as current. */
export function staleFacts(db: MasterDatabase, now: Date = new Date()): FactAssessment[] {
  return assessAll(db, now).filter((a) => a.health === "STALE");
}

export interface VerificationQueueItem {
  source_to_check: string;
  fact_count: number;
  entities: number;
  sample: string[];
}

/** Facts nobody has verified yet, grouped by the official source an editor should check them against. */
export function pendingVerification(db: MasterDatabase): VerificationQueueItem[] {
  const groups = new Map<string, FactRecord[]>();
  for (const f of db.facts) {
    if (f.verified_at) continue;
    const key = f.verify_against ?? "UNASSIGNED";
    const list = groups.get(key);
    if (list) list.push(f);
    else groups.set(key, [f]);
  }
  return [...groups.entries()]
    .map(([source_to_check, facts]) => ({
      source_to_check,
      fact_count: facts.length,
      entities: new Set(facts.map((f) => f.entity_id)).size,
      sample: facts.slice(0, 3).map((f) => f.fact_text)
    }))
    .sort((a, b) => b.fact_count - a.fact_count);
}

/** Normalises values so "₹50", "50" and 50 compare equal; strings compare case-insensitively. */
export function normaliseValue(v: FactRecord["value"]): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim().toLowerCase();
  const num = s.replace(/[₹,\s]/g, "");
  return /^\d+(\.\d+)?$/.test(num) ? String(Number(num)) : s;
}

export interface IncomingFact {
  entity_id: string;
  fact_type: string;
  value: FactRecord["value"];
  source_id: string;
}

/**
 * Compares an incoming claim against what is already stored. If two sources disagree
 * this returns a CONFLICT_RECORD (and flags the existing fact) instead of choosing a winner.
 * Same-value claims from a second source raise the existing fact to MULTIPLE_SOURCES.
 */
export function detectConflict(
  db: MasterDatabase, incoming: IncomingFact, now: Date = new Date()
): { kind: "NEW" | "CONFIRMED" | "CONFLICT"; conflict?: ConflictRecord; existing?: FactRecord } {
  const existing = db.facts.find((f) => f.entity_id === incoming.entity_id && f.fact_type === incoming.fact_type);
  if (!existing) return { kind: "NEW" };

  if (existing.source_id === incoming.source_id) {
    if (normaliseValue(existing.value) === normaliseValue(incoming.value)) return { kind: "CONFIRMED", existing };
    // same source changed its answer: still a conflict for an editor, not a silent overwrite
  }

  if (normaliseValue(existing.value) === normaliseValue(incoming.value)) {
    if (existing.confidence !== "VERIFIED" && existing.confidence !== "CONFLICTING") existing.confidence = "MULTIPLE_SOURCES";
    return { kind: "CONFIRMED", existing };
  }

  const conflict: ConflictRecord = {
    id: `CONFLICT-${String(db.conflict_records.length + 1).padStart(4, "0")}`,
    entity_id: incoming.entity_id,
    fact_type: incoming.fact_type,
    existing_fact_id: existing.id,
    existing_value: existing.value,
    existing_source_id: existing.source_id,
    incoming_value: incoming.value,
    incoming_source_id: incoming.source_id,
    status: "OPEN",
    detected_at: now.toISOString(),
    resolved_by: null,
    resolved_at: null,
    resolution_note: null
  };
  db.conflict_records.push(conflict);
  existing.confidence = "CONFLICTING";
  return { kind: "CONFLICT", conflict, existing };
}

/** Admin action: mark a fact verified against a source. Returns the updated fact. */
export function verifyFact(db: MasterDatabase, factId: string, verifier: string, now: Date = new Date()): FactRecord | null {
  const fact = db.facts.find((f) => f.id === factId);
  if (!fact) return null;
  const interval = VERIFICATION_INTERVAL_DAYS[fact.verification_frequency];
  fact.confidence = "VERIFIED";
  fact.verified_by = verifier;
  fact.verified_at = now.toISOString();
  fact.expires_at = new Date(now.getTime() + interval * DAY).toISOString();
  fact.status = "VERIFIED";
  return fact;
}

export function resolveConflict(
  db: MasterDatabase, conflictId: string, chosen: "EXISTING" | "INCOMING" | "DISMISS", by: string, note: string, now: Date = new Date()
): ConflictRecord | null {
  const c = db.conflict_records.find((x) => x.id === conflictId);
  if (!c) return null;
  const fact = db.facts.find((f) => f.id === c.existing_fact_id);
  if (fact && chosen === "INCOMING") {
    fact.value = c.incoming_value;
    fact.source_id = c.incoming_source_id;
  }
  if (fact) fact.confidence = chosen === "DISMISS" ? "UNVERIFIED" : "PROVISIONALLY_VERIFIED";
  c.status = chosen === "DISMISS" ? "DISMISSED" : "RESOLVED";
  c.resolved_by = by;
  c.resolved_at = now.toISOString();
  c.resolution_note = note;
  return c;
}

/** Confidence implied by the set of sources agreeing on a claim. */
export function confidenceForSources(sources: SourceRecord[], agree = true): Confidence {
  if (!agree) return "CONFLICTING";
  if (sources.length === 0) return "UNVERIFIED";
  const best = sources.some((s) => s.reliability_class === "A");
  if (sources.length >= 2) return "MULTIPLE_SOURCES";
  return best ? "SINGLE_SOURCE" : "UNVERIFIED";
}

export interface LinkIssue {
  kind: "MALFORMED_URL" | "INSECURE_URL" | "PLACEHOLDER_MEDIA" | "SOURCE_WITHOUT_URL";
  table: string;
  id: string;
  detail: string;
}

/**
 * Static link audit. Live HTTP reachability checks belong to the scheduled
 * link-checker job; this pass catches malformed, insecure and placeholder links offline.
 */
export function auditLinks(db: MasterDatabase): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const check = (table: string, id: string, url: string | null | undefined) => {
    if (!url) return;
    try {
      const u = new URL(url);
      if (u.protocol === "http:") issues.push({ kind: "INSECURE_URL", table, id, detail: url });
    } catch {
      issues.push({ kind: "MALFORMED_URL", table, id, detail: url });
    }
  };
  db.attractions.forEach((a) => {
    check("attractions", a.id, a.official_website);
    check("attractions", a.id, a.map_url);
  });
  db.sources.forEach((s) => {
    if (!s.url && s.source_type !== "AI_GENERATED") issues.push({ kind: "SOURCE_WITHOUT_URL", table: "sources", id: s.id, detail: s.source_name });
    check("sources", s.id, s.url);
  });
  db.emergency_services.forEach((e) => check("emergency_services", e.id, e.website));
  db.states.forEach((s) => {
    check("states", s.id, s.official_tourism_url);
    check("states", s.id, s.official_government_url);
  });
  const placeholders = db.media.filter((m) => m.copyright_status === "PLACEHOLDER").length;
  if (placeholders > 0) issues.push({ kind: "PLACEHOLDER_MEDIA", table: "media", id: "*", detail: `${placeholders} media records are placeholders awaiting licensed images` });
  return issues;
}
