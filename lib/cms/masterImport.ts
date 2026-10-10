import "@/lib/cms/server-guard";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "@/lib/master/ids";
import { getDb } from "@/lib/master/repo";
import { bootstrapFromSeed } from "./bootstrap";
import { allDestinations, getDestination, getPipelineJob, saveDestination, uniqueSlug } from "./store";
import { emptyAttraction, emptyDestination, type CmsCategory, type CmsDestination, type CompanionType, type SeedLink, type SourceRef, type TripCluster } from "./types";

/**
 * Import of the India Tourism Master Database workbook (sheets: Destinations, Trip Clusters,
 * Schema, Categories) into the CMS.
 *
 * Rules:
 * - Existing records are never duplicated or overwritten. A workbook row that matches an existing
 *   destination (same name, a known spelling variant, or the same place with a "National Park",
 *   "Caves", "Lake"… suffix) is LINKED: the row id is recorded on the record and only empty fields
 *   are filled. IDs, slugs, content, status and relationships stay as they are.
 * - Rows with no match are CREATED as DRAFT records marked UNVERIFIED. Nothing is published.
 * - Idempotent: a row whose id is already linked to a record is skipped on every later run.
 * - Resumable: rows are applied in batches and each finished row id is checkpointed, so an
 *   interrupted run continues where it stopped.
 * - Anything uncertain (same name in another state, an unknown state) is held for review, not guessed.
 */

export const MASTER_SOURCE = "India_Tourism_Master_Database_v1.xlsx";
const IMPORT_DIR = join(process.cwd(), "data", "cms", "imports");
const CHECKPOINT = join(IMPORT_DIR, "master-v1-checkpoint.json");
const REPORT = join(IMPORT_DIR, "master-v1-report.json");
const CLUSTERS = join(process.cwd(), "data", "cms", "clusters.json");

export const MASTER_COLUMNS = [
  "destination_id", "state_ut", "destination", "destination_type", "primary_cluster", "district", "latitude", "longitude",
  "best_months", "recommended_duration_days", "ideal_for", "key_attractions", "ancient_history_story", "historical_description",
  "current_description", "religious_significance", "local_food", "local_crafts", "activities", "nearby_destinations",
  "suggested_route", "seo_title", "seo_description", "image_queries", "content_status"
] as const;
export type MasterColumn = (typeof MASTER_COLUMNS)[number];
export type MasterRow = Record<MasterColumn, string | null>;

export interface MasterClusterRow {
  state_ut: string;
  cluster_name: string;
  typical_days: string | null;
  start_point: string | null;
  end_point: string | null;
  status: string | null;
}

export interface MasterWorkbook {
  file: string;
  sheets: string[];
  destinations: MasterRow[];
  clusters: MasterClusterRow[];
  categories: Array<{ category: string; definition: string }>;
  schema: Array<{ field: string; purpose: string; example: string }>;
  missing_columns: string[];
}

// ---- reading -------------------------------------------------------------------------------------

const cellText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    const o = v as { richText?: Array<{ text: string }>; text?: string; result?: unknown };
    if (o.richText) return o.richText.map((r) => r.text).join("").trim() || null;
    if (typeof o.text === "string") return o.text.trim() || null;
    if (o.result !== undefined) return cellText(o.result);
    if (v instanceof Date) return v.toISOString();
  }
  const s = String(v).trim();
  return s ? s : null;
};

/** Reads the workbook (xlsx bytes). Header names are matched case-insensitively. */
export async function readMasterWorkbook(data: Buffer | ArrayBuffer, file = MASTER_SOURCE): Promise<MasterWorkbook> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as ArrayBuffer);
  const rowsOf = (name: string): Array<Record<string, string | null>> => {
    const ws = wb.worksheets.find((w) => w.name.trim().toLowerCase() === name.toLowerCase());
    if (!ws) return [];
    const header: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => (header[i] = (cellText(c.value) ?? "").toLowerCase()));
    const out: Array<Record<string, string | null>> = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const rec: Record<string, string | null> = {};
      header.forEach((h, i) => h && (rec[h] = cellText(row.getCell(i).value)));
      if (Object.values(rec).some(Boolean)) out.push(rec);
    });
    return out;
  };
  const dest = rowsOf("Destinations");
  const present = new Set(Object.keys(dest[0] ?? {}));
  return {
    file,
    sheets: wb.worksheets.map((w) => w.name),
    destinations: dest.map((r) => Object.fromEntries(MASTER_COLUMNS.map((c) => [c, r[c] ?? null])) as MasterRow),
    clusters: rowsOf("Trip Clusters").map((r) => ({ state_ut: r.state_ut ?? "", cluster_name: r.cluster_name ?? "", typical_days: r.typical_days ?? null, start_point: r.start_point ?? null, end_point: r.end_point ?? null, status: r.status ?? null })).filter((c) => c.cluster_name),
    categories: rowsOf("Categories").map((r) => ({ category: r.category ?? "", definition: r.definition ?? "" })),
    schema: rowsOf("Schema").map((r) => ({ field: r.field ?? "", purpose: r.purpose ?? "", example: r.example ?? "" })),
    missing_columns: MASTER_COLUMNS.filter((c) => !present.has(c))
  };
}

// ---- matching ------------------------------------------------------------------------------------

export function normName(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}
const SUFFIX = /\b(national park|wildlife sanctuary|bird sanctuary|tiger reserve|sun temple|caves?|lake|fort|falls|waterfalls?|island|canyon|valley|beach|temple)\b/g;
export const coreName = (s: string) => normName(s).replace(SUFFIX, " ").replace(/\s+/g, " ").trim();

/**
 * Reviewed spelling variants: workbook spelling → spelling already used on the site (same place).
 * Each entry was checked by hand; the generic suffix rule covers "X National Park" ↔ "X" and similar.
 */
export const KNOWN_ALIASES: Record<string, string> = {
  "tsomgo lake": "tsongmo lake",
  "thiruvannamalai": "tiruvannamalai",
  "shravasti": "sravasti",
  "dzuko valley": "dzukou valley",
  "similipal national park": "simlipal",
  "nameri national park": "nameri",
  "bangalore": "bengaluru",
  "mysore": "mysuru",
  "allahabad": "prayagraj",
  "pondicherry": "puducherry",
  "cochin": "kochi",
  "trivandrum": "thiruvananthapuram",
  "calcutta": "kolkata",
  "bombay": "mumbai",
  "madras": "chennai",
  "benares": "varanasi",
  "banaras": "varanasi",
  "gurgaon": "gurugram",
  "ooty": "ooty",
  "udhagamandalam": "ooty",
  // Short forms used in the Trip Clusters sheet.
  "similipal": "simlipal",
  "tsomgo": "tsongmo lake",
  "nilgiris": "ooty"
};

/**
 * Reviewed by hand: the workbook row is a different place from the similarly named record, so it gets
 * its own record. Bishnupur (West Bengal, terracotta temples) is not Bishnupur (Manipur); Bharatpur
 * Beach is on Neil Island, not Bharatpur in Rajasthan; Diu Fort is a fort inside Diu, listed separately.
 */
export const KNOWN_DISTINCT = new Set(["bishnupur|West Bengal", "bharatpur beach|Andaman and Nicobar Islands", "diu fort|Dadra and Nagar Haveli and Daman and Diu"]);

const CATEGORY_MAP: Record<string, CmsCategory[]> = {
  heritage: ["HERITAGE", "HISTORICAL"],
  spiritual: ["SPIRITUAL"],
  nature: ["NATURE"],
  "wildlife & nature": ["WILDLIFE", "NATURE"],
  adventure: ["ADVENTURE"],
  culture: ["CULTURAL"],
  gastronomy: ["FOOD"],
  wellness: ["WELLNESS"],
  city: ["URBAN"],
  // "Destination / City" is the workbook's catch-all for towns and cities that have not been classified yet: no category is assumed.
  "destination / city": []
};

const COMPANION_MAP: Record<string, CompanionType> = { family: "FAMILY", couple: "COUPLE", couples: "COUPLE", honeymoon: "COUPLE", solo: "SOLO", friends: "FRIENDS", group: "FRIENDS" };

export function resolveState(name: string | null): { name: string; slug: string } | null {
  if (!name) return null;
  const key = (x: string) => x.toLowerCase().replace(/&/g, "and").replace(/^nct of /, "").replace(/[^a-z]+/g, " ").trim();
  const k = key(name);
  const s = getDb().states.find((st) => key(st.name) === k);
  return s ? { name: s.name, slug: s.slug } : null;
}

export type ActionKind = "CREATE" | "LINK_EXISTING" | "ALREADY_IMPORTED" | "REVIEW" | "INVALID" | "DUPLICATE_IN_SOURCE";

export interface PlannedAction {
  source_id: string;
  name: string;
  state: string;
  kind: ActionKind;
  target_id: string | null;
  match: "SOURCE_ID" | "EXACT" | "ALIAS" | "SUFFIX" | null;
  conflicts: string[];
  reason: string;
}

export function planImport(wb: MasterWorkbook, existing: CmsDestination[]): PlannedAction[] {
  const bySource = new Map<string, CmsDestination>();
  for (const d of existing) if (d.seed?.source === MASTER_SOURCE) for (const sid of [d.seed.source_id, ...(d.seed.other_source_ids ?? [])]) bySource.set(sid, d);
  const byName = new Map<string, CmsDestination[]>();
  const byCore = new Map<string, CmsDestination[]>();
  const add = (m: Map<string, CmsDestination[]>, k: string, d: CmsDestination) => k && m.set(k, [...(m.get(k) ?? []), d]);
  for (const d of existing) {
    add(byName, normName(d.name), d);
    add(byCore, coreName(d.name), d);
  }
  const seenInSource = new Map<string, string>();
  const actions: PlannedAction[] = [];
  // Records some workbook row names exactly (or by a known alias). A row that only resembles such a
  // record ("Konark Sun Temple" vs the "Konark" row) is a separate entry in the workbook, not the same place.
  const claimedExactly = new Set<string>();
  for (const r of wb.destinations) {
    const n = normName(r.destination ?? "");
    for (const k of [n, KNOWN_ALIASES[n]]) if (k) for (const d of byName.get(k) ?? []) claimedExactly.add(`${d.id}|${n}`);
  }
  const exactClaim = (d: CmsDestination, n: string) => [...claimedExactly].some((c) => c.startsWith(`${d.id}|`) && !c.endsWith(`|${n}`));

  for (const r of wb.destinations) {
    const id = r.destination_id ?? "";
    const name = (r.destination ?? "").trim();
    const base = { source_id: id, name, state: r.state_ut ?? "", target_id: null, match: null, conflicts: [] as string[] };
    if (!/^IN-\d{3,6}$/.test(id) || !name) {
      actions.push({ ...base, kind: "INVALID", reason: !name ? "missing destination name" : `destination_id "${id}" is not in the IN-0000 format` });
      continue;
    }
    const st = resolveState(r.state_ut);
    if (!st) {
      actions.push({ ...base, kind: "INVALID", reason: `state "${r.state_ut}" is not one of the 36 states/UTs` });
      continue;
    }
    const linked = bySource.get(id);
    if (linked) {
      actions.push({ ...base, state: st.name, kind: "ALREADY_IMPORTED", target_id: linked.id, match: "SOURCE_ID", reason: "row id already linked to this record" });
      continue;
    }
    const key = `${normName(name)}|${st.name}`;
    if (seenInSource.has(key)) {
      actions.push({ ...base, state: st.name, kind: "DUPLICATE_IN_SOURCE", reason: `same name and state as ${seenInSource.get(key)}` });
      continue;
    }
    seenInSource.set(key, id);

    const n = normName(name);
    const alias = KNOWN_ALIASES[n];
    const distinct = KNOWN_DISTINCT.has(`${n}|${st.name}`);
    const candidates: Array<{ d: CmsDestination; match: "EXACT" | "ALIAS" | "SUFFIX" }> = [
      ...(byName.get(n) ?? []).map((d) => ({ d, match: "EXACT" as const })),
      ...(alias ? (byName.get(alias) ?? []).map((d) => ({ d, match: "ALIAS" as const })) : []),
      ...(byCore.get(coreName(name)) ?? []).filter((d) => !exactClaim(d, n)).map((d) => ({ d, match: "SUFFIX" as const }))
    ];
    const sameState = candidates.find((c) => c.d.state === st.name);
    const anyState = candidates.find((c) => c.match !== "SUFFIX" && !distinct);
    const pick = sameState ?? anyState;
    if (pick) {
      const conflicts = pick.d.state && pick.d.state !== st.name ? [`state: workbook says "${st.name}", record says "${pick.d.state}"`] : [];
      if (normName(pick.d.name) !== n) conflicts.push(`name: workbook says "${name}", record is "${pick.d.name}"`);
      actions.push({ ...base, state: st.name, kind: "LINK_EXISTING", target_id: pick.d.id, match: pick.match, conflicts, reason: `matched ${pick.match.toLowerCase()} to ${pick.d.id}` });
      continue;
    }
    const crossStateSuffix = candidates.find((c) => c.match === "SUFFIX" && c.d.state !== st.name);
    if (crossStateSuffix && !distinct) {
      actions.push({ ...base, state: st.name, kind: "REVIEW", target_id: crossStateSuffix.d.id, reason: `"${name}" (${st.name}) resembles "${crossStateSuffix.d.name}" (${crossStateSuffix.d.state}) — check whether they are the same place` });
      continue;
    }
    actions.push({ ...base, state: st.name, kind: "CREATE", reason: distinct ? "same name exists in another state, reviewed as a different place" : "no existing record" });
  }
  return actions;
}

// ---- applying ------------------------------------------------------------------------------------

const now = () => new Date().toISOString();
const seedRef = (field: string): SourceRef => ({ label: `${MASTER_SOURCE} (seed list — unverified)`, url: null, retrieved_at: now(), status: "SEED", note: `workbook field: ${field}` });
const split = (v: string | null) => (v ? v.split(/[;,|]/).map((x) => x.trim()).filter(Boolean) : []);
const num = (v: string | null) => (v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

function seedLinkFor(r: MasterRow, relation: SeedLink["relation"], conflicts: string[], existing?: SeedLink | null): SeedLink {
  const id = r.destination_id!;
  // A second workbook row for the same place keeps the first row as the primary link and is listed alongside it.
  if (existing && existing.source_id !== id) {
    return {
      ...existing,
      other_source_ids: [...new Set([...(existing.other_source_ids ?? []), id])],
      conflicts: [...new Set([...existing.conflicts, ...conflicts, `also listed as ${id} "${r.destination}" (${r.state_ut})`])]
    };
  }
  return {
    source: MASTER_SOURCE,
    source_id: id,
    relation: existing?.relation ?? relation,
    imported_at: existing?.imported_at ?? now(),
    raw_type: r.destination_type ?? "",
    name_in_source: r.destination ?? "",
    state_in_source: r.state_ut ?? "",
    content_status: r.content_status ?? "",
    clusters: existing?.clusters ?? [],
    other_source_ids: existing?.other_source_ids,
    conflicts: [...new Set([...(existing?.conflicts ?? []), ...conflicts])]
  };
}

/**
 * Fills only empty fields from a workbook row; every value is recorded as unverified seed data.
 * (The v1 workbook carries names, states and types only — the content columns are empty — but
 * later versions can fill them and the same mapping applies.)
 */
function fillFromRow(d: CmsDestination, r: MasterRow): CmsDestination {
  const out: CmsDestination = { ...d, provenance: { ...d.provenance } };
  const prov = (field: string, src: string) => (out.provenance[field] = [...(out.provenance[field] ?? []), seedRef(src)]);
  const st = resolveState(r.state_ut);
  if (!out.state && st) { out.state = st.name; out.state_slug = st.slug; prov("state", "state_ut"); }
  const cats = CATEGORY_MAP[(r.destination_type ?? "").trim().toLowerCase()] ?? [];
  if (!out.categories.length && cats.length) { out.categories = cats; prov("categories", "destination_type"); }
  if (!out.district && r.district) { out.district = r.district; prov("district", "district"); }
  const lat = num(r.latitude), lon = num(r.longitude);
  if (out.latitude === null && out.longitude === null && lat !== null && lon !== null && lat > 5 && lat < 38 && lon > 67 && lon < 98) {
    out.latitude = lat; out.longitude = lon; prov("coordinates", "latitude/longitude");
  }
  if (!out.best_time_text && r.best_months) { out.best_time_text = r.best_months; prov("best_time_text", "best_months"); }
  if (!out.ideal_duration_text && r.recommended_duration_days) { out.ideal_duration_text = `${r.recommended_duration_days} days`; prov("ideal_duration_text", "recommended_duration_days"); }
  if (!out.companions.length) {
    const c = [...new Set(split(r.ideal_for).map((x) => COMPANION_MAP[x.toLowerCase()]).filter((x): x is CompanionType => Boolean(x)))];
    if (c.length) { out.companions = c; prov("companions", "ideal_for"); }
  }
  if (!out.short_description && r.current_description) { out.short_description = r.current_description.slice(0, 1000); prov("short_description", "current_description"); }
  if (!out.about && r.current_description) { out.about = r.current_description; prov("about", "current_description"); }
  if (!out.history && (r.historical_description || r.ancient_history_story)) {
    out.history = [r.historical_description, r.ancient_history_story].filter(Boolean).join("\n\n");
    out.history_verified = false;
    prov("history", "historical_description / ancient_history_story");
  }
  if (!out.attractions.length && r.key_attractions) {
    out.attractions = split(r.key_attractions).slice(0, 30).map((name, i) => ({ ...emptyAttraction(`${out.slug}-att-${slugify(name)}`, slugify(name), name), sort_order: i, sources: [seedRef("key_attractions")] }));
  }
  if (!out.seo.title && r.seo_title) out.seo = { ...out.seo, title: r.seo_title.slice(0, 120) };
  if (!out.seo.description && r.seo_description) out.seo = { ...out.seo, description: r.seo_description.slice(0, 320) };
  return out;
}

export interface ApplyResult {
  created: string[];
  linked: string[];
  already: string[];
  review: PlannedAction[];
  invalid: PlannedAction[];
  duplicates_in_source: PlannedAction[];
  failures: Array<{ source_id: string; error: string }>;
  skipped_by_checkpoint: number;
}

interface Checkpoint {
  source: string;
  started_at: string;
  updated_at: string;
  done: string[];
}

function readJson<T>(f: string): T | null {
  try {
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(f: string, data: unknown) {
  const dir = f.slice(0, f.lastIndexOf("/") === -1 ? f.lastIndexOf("\\") : f.lastIndexOf("/"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, f);
}

/** Applies a plan in batches, checkpointing each finished row. Safe to re-run at any time. */
export function applyImport(wb: MasterWorkbook, plan: PlannedAction[], opts: { batchSize?: number; onBatch?: (done: number, total: number) => void } = {}): ApplyResult {
  bootstrapFromSeed();
  const rows = new Map(wb.destinations.map((r) => [r.destination_id ?? "", r]));
  const cp: Checkpoint = readJson<Checkpoint>(CHECKPOINT) ?? { source: wb.file, started_at: now(), updated_at: now(), done: [] };
  const done = new Set(cp.done);
  const res: ApplyResult = { created: [], linked: [], already: [], review: [], invalid: [], duplicates_in_source: [], failures: [], skipped_by_checkpoint: 0 };
  const size = Math.max(1, opts.batchSize ?? 50);
  const work = plan.filter((a) => {
    if (a.kind === "REVIEW") res.review.push(a);
    else if (a.kind === "INVALID") res.invalid.push(a);
    else if (a.kind === "DUPLICATE_IN_SOURCE") res.duplicates_in_source.push(a);
    else if (a.kind === "ALREADY_IMPORTED") res.already.push(a.target_id!);
    else return true;
    return false;
  });
  for (let i = 0; i < work.length; i += size) {
    for (const a of work.slice(i, i + size)) {
      if (done.has(a.source_id)) {
        res.skipped_by_checkpoint++;
        continue;
      }
      try {
        const r = rows.get(a.source_id)!;
        if (a.kind === "LINK_EXISTING") {
          const d = getDestination(a.target_id!);
          if (!d) throw new Error(`target ${a.target_id} disappeared`);
          saveDestination({ ...fillFromRow(d, r), seed: seedLinkFor(r, "LINKED", a.conflicts, d.seed?.source === MASTER_SOURCE ? d.seed : null), verification_status: d.verification_status ?? (d.status === "PUBLISHED" ? undefined : "UNVERIFIED") });
          res.linked.push(d.id);
        } else {
          const st = resolveState(r.state_ut)!;
          const all = allDestinations();
          let slug = slugify(a.name);
          if (all.some((x) => x.slug === slug)) slug = slugify(`${a.name} ${st.name}`);
          slug = uniqueSlug(slug);
          const base = emptyDestination(`CMS-${slug}`, a.name, slug, now());
          const doc: CmsDestination = {
            ...base,
            state: st.name,
            state_slug: st.slug,
            status: "DRAFT",
            verification_status: "UNVERIFIED",
            provenance: { created: [seedRef("destination_id / destination / state_ut")] },
            seed: seedLinkFor(r, "CREATED", [])
          };
          saveDestination(fillFromRow(doc, r));
          res.created.push(doc.id);
        }
        done.add(a.source_id);
      } catch (e) {
        res.failures.push({ source_id: a.source_id, error: e instanceof Error ? e.message : String(e) });
      }
    }
    writeJson(CHECKPOINT, { ...cp, updated_at: now(), done: [...done] });
    opts.onBatch?.(Math.min(i + size, work.length), work.length);
  }
  return res;
}

export const resetCheckpoint = () => existsSync(CHECKPOINT) && writeJson(CHECKPOINT, { source: MASTER_SOURCE, started_at: now(), updated_at: now(), done: [] });

// ---- trip clusters -------------------------------------------------------------------------------

export function getClusters(): TripCluster[] {
  return readJson<{ clusters: TripCluster[] }>(CLUSTERS)?.clusters ?? [];
}

/** Builds the trip clusters and links every resolvable stop to a destination record. Re-running replaces the file and the links. */
export function importClusters(wb: MasterWorkbook): { clusters: TripCluster[]; unresolved_parts: number } {
  const all = allDestinations();
  const find = (part: string, state: string): CmsDestination | null => {
    const n = normName(part);
    const keys = [n, KNOWN_ALIASES[n]].filter(Boolean) as string[];
    const inState = (d: CmsDestination) => d.state === state || d.seed?.state_in_source === state;
    const exact = all.filter((d) => keys.includes(normName(d.name)));
    const core = all.filter((d) => coreName(d.name) === coreName(part));
    // "Ujjayanta" → "Ujjayanta Palace", "Qutub" → "Qutub Minar": a record in the same state whose name starts with the stop.
    const prefix = n.length >= 4 ? all.filter((d) => normName(d.name).startsWith(`${n} `)) : [];
    return (
      exact.find(inState) ??
      core.find(inState) ??
      (prefix.filter(inState).length === 1 ? prefix.find(inState)! : null) ??
      // A circuit can cross a border (Delhi – Agra): a name that exists exactly once in India is unambiguous.
      (exact.length === 1 ? exact[0] : null)
    );
  };
  let unresolved = 0;
  const seen = new Set<string>();
  const clusters: TripCluster[] = [];
  for (const c of wb.clusters) {
    const st = resolveState(c.state_ut);
    const state = st?.name ?? c.state_ut;
    const slug = slugify(`${c.cluster_name}`);
    let id = `CL-${slugify(state)}-${slug}`;
    if (seen.has(id)) id = `${id}-${clusters.length}`;
    seen.add(id);
    const parts = c.cluster_name.split(/\s*[–—-]\s*/).map((p) => p.trim()).filter(Boolean);
    const members = parts.map((part) => {
      const d = find(part, state);
      if (!d) unresolved++;
      return { part, destination_id: d?.id ?? null };
    });
    clusters.push({ id, slug, state, name: c.cluster_name, parts, members, typical_days: c.typical_days, start_point: c.start_point, end_point: c.end_point, status_in_source: c.status ?? "", source: wb.file, imported_at: now() });
  }
  writeJson(CLUSTERS, { source: wb.file, imported_at: now(), note: "Draft circuits from the master workbook. Road/rail timings are not validated.", clusters });
  // Write the membership back onto the destination records that carry a seed link.
  const byDest = new Map<string, string[]>();
  for (const c of clusters) for (const m of c.members) if (m.destination_id) byDest.set(m.destination_id, [...new Set([...(byDest.get(m.destination_id) ?? []), c.id])]);
  for (const d of all) {
    const ids = byDest.get(d.id) ?? [];
    if (d.seed && JSON.stringify(d.seed.clusters) !== JSON.stringify(ids)) saveDestination({ ...d, seed: { ...d.seed, clusters: ids } });
  }
  return { clusters, unresolved_parts: unresolved };
}

// ---- reporting -----------------------------------------------------------------------------------

export interface ImportReport {
  source: string;
  generated_at: string;
  workbook: { sheets: string[]; destination_rows: number; cluster_rows: number; categories: number; filled_columns: Record<string, number>; missing_columns: string[] };
  /** Totals across all runs, read from the records. */
  totals: { records_on_site: number; created_from_workbook: number; existing_records_linked: number; workbook_rows_covered: number; workbook_rows: number; unverified: number; published: number };
  /** What this run did. */
  counts: { created: number; linked_existing: number; already_imported: number; held_for_review: number; invalid: number; duplicates_in_source: number; failures: number };
  matches: { exact: number; alias: number; suffix: number };
  conflicts: Array<{ source_id: string; name: string; target_id: string | null; conflicts: string[] }>;
  review: PlannedAction[];
  invalid: PlannedAction[];
  failures: Array<{ source_id: string; error: string }>;
  clusters: { total: number; with_all_stops_resolved: number; unresolved_stops: number; unresolved: Array<{ cluster: string; state: string; stop: string }> };
  states: Array<{ state: string; in_workbook: number; created: number; linked: number; site_total: number; published: number; with_coordinates: number }>;
  queued_for_enrichment: number;
}

export function buildReport(wb: MasterWorkbook, plan: PlannedAction[], res: ApplyResult, clusters: { clusters: TripCluster[]; unresolved_parts: number }, queued: number): ImportReport {
  const all = allDestinations();
  const seeded = all.filter((d) => d.seed?.source === MASTER_SOURCE);
  const filled = Object.fromEntries(MASTER_COLUMNS.map((c) => [c, wb.destinations.filter((r) => r[c]).length]));
  const states = getDb().states.map((s) => {
    const inWb = plan.filter((a) => a.state === s.name);
    const site = all.filter((d) => d.state === s.name);
    return {
      state: s.name,
      in_workbook: inWb.length,
      // Cumulative, from the records themselves, so a re-run (which creates nothing) still reports the totals.
      created: site.filter((d) => d.seed?.source === MASTER_SOURCE && d.seed.relation === "CREATED").length,
      linked: site.filter((d) => d.seed?.source === MASTER_SOURCE && d.seed.relation === "LINKED").length,
      site_total: site.length,
      published: site.filter((d) => d.status === "PUBLISHED").length,
      with_coordinates: site.filter((d) => d.latitude !== null && d.longitude !== null).length
    };
  });
  const report: ImportReport = {
    source: wb.file,
    generated_at: now(),
    workbook: { sheets: wb.sheets, destination_rows: wb.destinations.length, cluster_rows: wb.clusters.length, categories: wb.categories.length, filled_columns: filled, missing_columns: wb.missing_columns },
    totals: {
      records_on_site: all.length,
      created_from_workbook: seeded.filter((d) => d.seed!.relation === "CREATED").length,
      existing_records_linked: seeded.filter((d) => d.seed!.relation === "LINKED").length,
      workbook_rows_covered: seeded.reduce((n, d) => n + 1 + (d.seed!.other_source_ids?.length ?? 0), 0),
      workbook_rows: wb.destinations.length,
      unverified: seeded.filter((d) => d.verification_status === "UNVERIFIED").length,
      published: seeded.filter((d) => d.status === "PUBLISHED").length
    },
    counts: {
      created: res.created.length,
      linked_existing: res.linked.length,
      already_imported: res.already.length,
      held_for_review: res.review.length,
      invalid: res.invalid.length,
      duplicates_in_source: res.duplicates_in_source.length,
      failures: res.failures.length
    },
    matches: { exact: plan.filter((a) => a.match === "EXACT").length, alias: plan.filter((a) => a.match === "ALIAS").length, suffix: plan.filter((a) => a.match === "SUFFIX").length },
    conflicts: seeded.filter((d) => d.seed!.conflicts.length).map((d) => ({ source_id: d.seed!.source_id, name: d.seed!.name_in_source, target_id: d.id, conflicts: d.seed!.conflicts })).sort((a, b) => a.source_id.localeCompare(b.source_id)),
    review: res.review,
    invalid: res.invalid,
    failures: res.failures,
    clusters: { total: clusters.clusters.length, with_all_stops_resolved: clusters.clusters.filter((c) => c.members.every((m) => m.destination_id)).length, unresolved_stops: clusters.unresolved_parts, unresolved: clusters.clusters.flatMap((c) => c.members.filter((m) => !m.destination_id).map((m) => ({ cluster: c.name, state: c.state, stop: m.part }))) },
    states,
    queued_for_enrichment: queued
  };
  writeJson(REPORT, report);
  return report;
}

export const lastReport = () => readJson<ImportReport>(REPORT);

/** Ids of seed-linked records that still need research and are not yet in the pipeline queue. */
export function enrichmentCandidates(): string[] {
  const queued = new Set(getPipelineJob().queue);
  return allDestinations()
    .filter((d) => d.seed?.source === MASTER_SOURCE && d.status !== "PUBLISHED" && !queued.has(d.id))
    .sort((a, b) => (a.seed!.source_id < b.seed!.source_id ? -1 : 1))
    .map((d) => d.id);
}

// ---- one call for the CLI and the admin screen ---------------------------------------------------

export interface PlanSummary {
  rows: number;
  clusters: number;
  sheets: string[];
  missing_columns: string[];
  tally: Record<string, number>;
  attention: PlannedAction[];
}

/**
 * Reads a workbook and either previews the plan (dryRun) or applies it: rows in batches with a
 * checkpoint, then clusters, then (unless queue is false) the research queue. Returns the report.
 */
export async function runMasterImport(data: Buffer | ArrayBuffer, file: string, opts: { dryRun?: boolean; batchSize?: number; restart?: boolean; queue?: boolean; onBatch?: (done: number, total: number) => void; enqueue?: (ids: string[]) => void } = {}): Promise<{ plan: PlanSummary; report: ImportReport | null }> {
  const wb = await readMasterWorkbook(data, file);
  bootstrapFromSeed();
  const plan = planImport(wb, allDestinations());
  const summary: PlanSummary = {
    rows: wb.destinations.length,
    clusters: wb.clusters.length,
    sheets: wb.sheets,
    missing_columns: wb.missing_columns,
    tally: plan.reduce<Record<string, number>>((m, a) => ({ ...m, [a.kind]: (m[a.kind] ?? 0) + 1 }), {}),
    attention: plan.filter((a) => a.kind === "REVIEW" || a.kind === "INVALID" || a.kind === "DUPLICATE_IN_SOURCE" || a.conflicts.length > 0)
  };
  if (opts.dryRun) return { plan: summary, report: null };
  if (opts.restart) resetCheckpoint();
  const res = applyImport(wb, plan, { batchSize: opts.batchSize, onBatch: opts.onBatch });
  const clusters = importClusters(wb);
  let queued = 0;
  if (opts.queue !== false && opts.enqueue) {
    const ids = enrichmentCandidates();
    if (ids.length) opts.enqueue(ids);
    queued = ids.length;
  }
  return { plan: summary, report: buildReport(wb, plan, res, clusters, queued) };
}
