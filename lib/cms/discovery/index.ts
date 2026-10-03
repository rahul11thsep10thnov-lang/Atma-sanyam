import "@/lib/cms/server-guard";
import type { CmsImage, ImageProviderId, ImageSearchState, ProviderRun, ProviderRunStatus, SiteSettings } from "../types";
import { IMAGE_PROVIDERS } from "../types";
import { getSecret, type SecretName } from "../secrets";
import { imageReachable } from "./http";
import { assess, dedupeKeys, REJECT_LABEL, type RejectReason } from "./quality";
import type { Found, ProviderAdapter, Query, Subject } from "./types";
import { queryLabel } from "./types";
import { wikimedia } from "./providers/wikimedia";
import { pixabay } from "./providers/pixabay";
import { unsplash } from "./providers/unsplash";
import { pexels } from "./providers/pexels";

/**
 * Image Discovery Service — finds ~N candidate photographs for one subject
 * (an attraction, or the destination itself) using only official provider
 * APIs, then normalises, de-duplicates, licence-checks and quality-screens
 * them. Order: Wikimedia Commons → Pixabay → Pexels (if enabled) → Unsplash
 * (optional, only when still short of candidates). A provider that fails
 * (403, 429, 404, timeout, empty) is recorded and the next one is tried; a
 * provider that is unreachable once is skipped for the rest of the run
 * instead of being hammered. Fewer than N trustworthy candidates is fine —
 * the list is never padded with doubtful images.
 */

export const ADAPTERS: Record<ImageProviderId, ProviderAdapter> = { wikimedia, pixabay, unsplash, pexels };
const ORDER: ImageProviderId[] = ["wikimedia", "pixabay", "pexels", "unsplash"];
const FAILED: ProviderRunStatus[] = ["PROVIDER_UNAVAILABLE", "RATE_LIMITED", "ERROR"];

/** State shared across the subjects of one destination run. */
export interface RunContext {
  /** Providers that already failed in this run, with the status to report. */
  down: Map<ImageProviderId, { status: ProviderRunStatus; note: string | null; http_status: number | null }>;
}
export const newRunContext = (): RunContext => ({ down: new Map() });

export interface DiscoveryResult {
  candidates: CmsImage[];
  rejected: CmsImage[];
  state: ImageSearchState;
}

export function providerReady(id: ImageProviderId, settings: SiteSettings): { usable: boolean; status: ProviderRunStatus | null; note: string | null } {
  if (!settings.image_providers?.[id]?.enabled) return { usable: false, status: "DISABLED", note: "Disabled in Image Providers" };
  if (ADAPTERS[id].needsKey && !getSecret(id as SecretName)) return { usable: false, status: "NOT_CONFIGURED", note: "API key not configured" };
  return { usable: true, status: null, note: null };
}

export async function discoverImages(subject: Subject, settings: SiteSettings, ctx: RunContext = newRunContext()): Promise<DiscoveryResult> {
  const target = Math.max(1, Math.min(settings.images_per_attraction || 10, 20));
  const minLong = settings.min_image_long_edge || 1000;
  const runs: ProviderRun[] = [];
  const queries: string[] = [];
  const accepted: Array<{ f: Found; score: number }> = [];
  const rejected: CmsImage[] = [];
  const seen = new Set<string>();
  const seenIds = new Set<string>();

  const consider = (f: Found) => {
    // The same result returned again by a later query: already handled, nothing to record.
    const own = `${f.image.provider}:${f.image.provider_image_id ?? f.image.id}`;
    if (seenIds.has(own)) return false;
    seenIds.add(own);
    const keys = dedupeKeys(f);
    if (keys.some((k) => seen.has(k))) {
      if (rejected.length < 24) rejected.push(markRejected(f.image, "DUPLICATE", null));
      return false;
    }
    keys.forEach((k) => seen.add(k));
    const a = assess(f, subject, minLong);
    if (!a.ok) {
      if (rejected.length < 24) rejected.push(markRejected(f.image, a.reason!, a.detail));
      return false;
    }
    accepted.push({ f, score: a.score });
    return true;
  };

  for (const id of ORDER) {
    const adapter = ADAPTERS[id];
    const run: ProviderRun = { provider: id, status: "NO_RESULTS", found: 0, kept: 0, requests: 0, http_status: null, note: null };
    runs.push(run);
    const ready = providerReady(id, settings);
    if (!ready.usable) {
      Object.assign(run, { status: ready.status, note: ready.note });
      continue;
    }
    const down = ctx.down.get(id);
    if (down) {
      Object.assign(run, { status: down.status, http_status: down.http_status, note: `${down.note ?? down.status} (not retried in this run)` });
      continue;
    }
    if (id === "unsplash" && accepted.length >= target) {
      Object.assign(run, { status: "SKIPPED", note: "Enough candidates from free-licence providers" });
      continue;
    }

    const plan: Query[] = adapter.queries(subject).map((text) => ({ kind: "text", text }) as Query);
    if (adapter.supportsGeo && subject.lat != null && subject.lon != null) {
      // Geo search goes after the name-specific queries but before the broad city query.
      plan.splice(Math.max(1, plan.length - 1), 0, { kind: "geo", lat: subject.lat, lon: subject.lon, radius_m: subject.kind === "attraction" ? 400 : 2500 });
    }
    let anyOk = false;
    for (const q of plan) {
      if (accepted.length >= target * 2) break;
      queries.push(`${id}: ${queryLabel(q)}`);
      run.requests++;
      const res = await adapter.search(q, subject);
      run.http_status = res.http_status ?? run.http_status;
      if (FAILED.includes(res.status) || res.status === "NOT_CONFIGURED") {
        Object.assign(run, { status: res.status, note: res.note });
        if (res.status !== "NOT_CONFIGURED") ctx.down.set(id, { status: res.status, note: res.note, http_status: res.http_status });
        break;
      }
      anyOk = true;
      run.found += res.items.length;
      for (const f of res.items) consider(f);
    }
    if (!FAILED.includes(run.status) && run.status !== "NOT_CONFIGURED") run.status = anyOk && run.found > 0 ? "OK" : "NO_RESULTS";
  }

  // Best first; then make sure the chosen images actually load.
  accepted.sort((a, b) => b.score - a.score);
  const chosen: Array<{ f: Found; score: number }> = [];
  for (let i = 0; i < accepted.length && chosen.length < target; i += 5) {
    const batch = accepted.slice(i, i + Math.min(5, target - chosen.length + 2));
    const ok = await Promise.all(batch.map((c) => imageReachable(c.f.image.thumbnail_url ?? c.f.image.url)));
    batch.forEach((c, k) => {
      if (ok[k] && chosen.length < target) chosen.push(c);
      else if (!ok[k] && rejected.length < 24) rejected.push(markRejected(c.f.image, "BROKEN_IMAGE", null));
    });
  }

  const candidates = chosen.map((c, i) => ({ ...c.f.image, relevance_score: c.score, sort_order: i }));
  for (const run of runs) run.kept = candidates.filter((c) => c.provider === run.provider).length;

  const attempted = runs.filter((r) => !["DISABLED", "NOT_CONFIGURED", "SKIPPED"].includes(r.status));
  const failed = attempted.filter((r) => FAILED.includes(r.status));
  const status: ImageSearchState["status"] =
    attempted.length === 0 || (failed.length === attempted.length && candidates.length === 0) ? "FAILED"
      : candidates.length === 0 ? "NO_RESULTS"
        : failed.length > 0 ? "PARTIAL"
          : "COMPLETED";

  return {
    candidates,
    rejected,
    state: { status, searched_at: new Date().toISOString(), providers: runs, final_candidates: candidates.length, auto_rejected: rejected.length, queries }
  };
}

function markRejected(img: CmsImage, reason: RejectReason, detail: string | null): CmsImage {
  return { ...img, approval_status: "REJECTED", rejection_reason: `AUTO ${reason}: ${REJECT_LABEL[reason]}${detail ? ` (${detail})` : ""}` };
}

/** Minimal live check used by Admin → Image Providers → "Test". */
export async function testProvider(id: ImageProviderId): Promise<{ status: ProviderRunStatus; note: string | null; results: number }> {
  if (!(IMAGE_PROVIDERS as readonly string[]).includes(id)) return { status: "ERROR", note: "unknown provider", results: 0 };
  const res = await ADAPTERS[id].search({ kind: "text", text: "Taj Mahal Agra" }, { kind: "destination", name: "Agra", city: "Agra", cityAliases: [], state: "Uttar Pradesh", lat: null, lon: null, otherPlaces: [] });
  return { status: res.status, note: res.note, results: res.items.length };
}
