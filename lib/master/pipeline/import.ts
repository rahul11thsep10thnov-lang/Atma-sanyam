import { readFile } from "node:fs/promises";
import { addFact } from "../seed/builder";
import { detectConflict, normaliseValue } from "../engine/verification";
import type { FactRecord, MasterDatabase } from "../types";
import { slugify } from "../ids";

/**
 * Source-import pipeline (spec sections 44, 53, 54):
 *   SOURCE EXTRACTION (adapter) → ENTITY EXTRACTION → DEDUPLICATION → NORMALISATION
 *   → FACT STORAGE → VERIFICATION (conflict detection).
 * Claims are stored as facts with their source; a claim that disagrees with an
 * existing fact becomes a CONFLICT_RECORD for an admin — it never overwrites.
 */

export interface RawClaim {
  source_id: string;
  /** Either the permanent id or a name (+ optional state) to resolve. */
  entity: { id?: string; name?: string; state?: string };
  fact_type: string;
  value: string | number | boolean | null;
  text?: string;
  unit?: string | null;
}

/** Anything that can yield claims: a JSON file, an official-site scraper, an API client… */
export interface SourceAdapter {
  readonly name: string;
  discover(): Promise<RawClaim[]>;
}

export class JsonFileAdapter implements SourceAdapter {
  readonly name: string;
  constructor(private path: string) {
    this.name = `json:${path}`;
  }
  async discover(): Promise<RawClaim[]> {
    const parsed = JSON.parse(await readFile(this.path, "utf8")) as { claims?: RawClaim[] } | RawClaim[];
    return Array.isArray(parsed) ? parsed : parsed.claims ?? [];
  }
}

export interface ImportReport {
  received: number;
  added: FactRecord[];
  confirmed: number;
  duplicates: number;
  conflicts: string[];
  /** Entities the claim mentions but the database does not know — candidates for new destinations, never auto-created. */
  unresolved: Array<{ name: string; state?: string; claims: number }>;
  errors: Array<{ claim: RawClaim; reason: string }>;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

/** ENTITY EXTRACTION: resolve a claim's entity to a permanent id, tolerating small spelling differences. */
export function resolveEntity(db: MasterDatabase, ref: RawClaim["entity"]): string | null {
  if (ref.id) {
    return db.destinations.some((d) => d.id === ref.id) || db.attractions.some((a) => a.id === ref.id) ? ref.id : null;
  }
  if (!ref.name) return null;
  const slug = slugify(ref.name);
  const state = ref.state ? db.states.find((s) => s.name.toLowerCase() === ref.state!.toLowerCase() || s.slug === slugify(ref.state!)) : null;
  const inState = <T extends { state_id?: string; destination_id?: string }>(row: T, stateId: string | undefined, destState: (id: string) => string | undefined) =>
    !stateId || (row.state_id ?? destState(row.destination_id ?? "")) === stateId;
  const destState = (id: string) => db.destinations.find((d) => d.id === id)?.state_id;

  const candidates = [
    ...db.destinations.map((d) => ({ id: d.id, slug: d.slug, name: d.name, ok: inState(d, state?.id, destState) })),
    ...db.attractions.map((a) => ({ id: a.id, slug: a.slug, name: a.name, ok: inState(a, state?.id, destState) }))
  ].filter((c) => c.ok);

  const exact = candidates.find((c) => c.slug === slug);
  if (exact) return exact.id;
  const fuzzy = candidates
    .map((c) => ({ c, d: levenshtein(slug, c.slug) }))
    .filter((x) => x.d <= Math.max(1, Math.floor(slug.length * 0.15)))
    .sort((a, b) => a.d - b.d);
  return fuzzy.length === 1 || (fuzzy.length > 1 && fuzzy[0].d < fuzzy[1].d) ? fuzzy[0].c.id : null;
}

/** NORMALISATION: trims text and turns "₹ 1,500" style strings into numbers so equal claims compare equal. */
export function normaliseClaim(c: RawClaim): RawClaim {
  let value = c.value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const num = trimmed.replace(/[₹,\s]/g, "");
    value = /^₹?\s*[\d,]+(\.\d+)?$/.test(trimmed) ? Number(num) : trimmed;
  }
  return { ...c, value, text: c.text?.trim() };
}

export function runImport(db: MasterDatabase, claims: RawClaim[]): ImportReport {
  const report: ImportReport = { received: claims.length, added: [], confirmed: 0, duplicates: 0, conflicts: [], unresolved: [], errors: [] };
  const unresolved = new Map<string, { name: string; state?: string; claims: number }>();

  for (const raw of claims) {
    if (!db.sources.some((s) => s.id === raw.source_id)) {
      report.errors.push({ claim: raw, reason: `unknown source ${raw.source_id}` });
      continue;
    }
    const claim = normaliseClaim(raw);
    const entityId = resolveEntity(db, claim.entity);
    if (!entityId) {
      const key = `${claim.entity.name ?? claim.entity.id}|${claim.entity.state ?? ""}`;
      const u = unresolved.get(key) ?? { name: claim.entity.name ?? String(claim.entity.id), state: claim.entity.state, claims: 0 };
      u.claims += 1;
      unresolved.set(key, u);
      continue;
    }

    const already = db.facts.find(
      (f) => f.entity_id === entityId && f.fact_type === claim.fact_type && f.source_id === claim.source_id && normaliseValue(f.value) === normaliseValue(claim.value)
    );
    if (already) {
      report.duplicates += 1;
      continue;
    }

    const outcome = detectConflict(db, { entity_id: entityId, fact_type: claim.fact_type, value: claim.value, source_id: claim.source_id });
    if (outcome.kind === "CONFLICT") {
      report.conflicts.push(outcome.conflict!.id);
      continue;
    }
    if (outcome.kind === "CONFIRMED") {
      report.confirmed += 1;
      continue;
    }
    const fact = addFact(db, {
      entity_id: entityId, fact_type: claim.fact_type, fact_text: claim.text ?? `${claim.fact_type}: ${claim.value}`,
      value: claim.value, unit: claim.unit ?? null, source_id: claim.source_id, confidence: "SINGLE_SOURCE"
    });
    report.added.push(fact);
  }
  report.unresolved = [...unresolved.values()];
  return report;
}

export async function importFromAdapter(db: MasterDatabase, adapter: SourceAdapter): Promise<ImportReport> {
  return runImport(db, await adapter.discover());
}
