import "@/lib/cms/server-guard";
import { bootstrapFromSeed } from "./bootstrap";
import { allDestinations, getDestinationBySlug } from "./store";
import { getClusters, MASTER_SOURCE } from "./masterImport";
import type { CmsDestination, SourceRef, TripCluster } from "./types";

/**
 * Public view of destinations that are in the master list but not yet researched and published.
 *
 * A stub shows only what the workbook itself states — the name, the state, how the list classifies the
 * place and the draft circuits it belongs to — plus any location hints gathered so far, each labelled
 * unverified with its source. Draft text (descriptions, history, hours, prices, photos) never appears
 * here: it shows up only once an editor publishes the full page.
 */

export interface SeedHint {
  label: string;
  value: string;
  href: string | null;
  source: SourceRef | null;
}

export interface SeedStub {
  id: string;
  slug: string;
  name: string;
  state: string | null;
  state_slug: string | null;
  listed_as: string;
  hints: SeedHint[];
  href: string; // locale-less
}

export interface ClusterStop {
  part: string;
  href: string | null; // locale-less
  name: string | null;
  researched: boolean; // true when the stop has a published page
}

export interface ClusterView {
  id: string;
  name: string;
  state: string;
  typical_days: string | null;
  stops: ClusterStop[];
}

const isStub = (d: CmsDestination) => d.status !== "PUBLISHED" && d.status !== "ARCHIVED" && d.seed?.source === MASTER_SOURCE;

function hintsOf(d: CmsDestination): SeedHint[] {
  const first = (field: string) => d.provenance[field]?.find((s) => s.status === "WEB_SEARCH" || s.status === "OK") ?? null;
  const out: SeedHint[] = [];
  const district = first("district");
  if (d.district && district) out.push({ label: "District", value: d.district, href: null, source: district });
  const coords = first("coordinates");
  if (d.latitude !== null && d.longitude !== null && coords)
    out.push({
      label: "Approximate location",
      value: `${d.latitude.toFixed(3)}, ${d.longitude.toFixed(3)}`,
      href: `https://www.openstreetmap.org/?mlat=${d.latitude}&mlon=${d.longitude}#map=11/${d.latitude}/${d.longitude}`,
      source: coords
    });
  return out;
}

function stubOf(d: CmsDestination): SeedStub {
  return { id: d.id, slug: d.slug, name: d.name, state: d.state, state_slug: d.state_slug, listed_as: d.seed?.raw_type ?? "", hints: hintsOf(d), href: `/destinations/${d.slug}` };
}

export function seedStubBySlug(slug: string): SeedStub | null {
  bootstrapFromSeed();
  const d = getDestinationBySlug(slug);
  return d && isStub(d) ? stubOf(d) : null;
}

export function seedStubs(): SeedStub[] {
  bootstrapFromSeed();
  return allDestinations().filter(isStub).map(stubOf).sort((a, b) => a.name.localeCompare(b.name));
}

export function seedStubsOfState(state: string): SeedStub[] {
  return seedStubs().filter((s) => s.state === state);
}

function view(c: TripCluster, byId: Map<string, CmsDestination>): ClusterView {
  return {
    id: c.id,
    name: c.name,
    state: c.state,
    typical_days: c.typical_days,
    stops: c.members.map((m) => {
      const d = m.destination_id ? byId.get(m.destination_id) : undefined;
      const visible = d && (d.status === "PUBLISHED" || isStub(d));
      return { part: m.part, href: visible ? `/destinations/${d!.slug}` : null, name: d?.name ?? null, researched: d?.status === "PUBLISHED" };
    })
  };
}

/** Draft circuits from the master workbook (road/rail timings not validated), optionally for one state. */
export function draftCircuits(state?: string): ClusterView[] {
  bootstrapFromSeed();
  const byId = new Map(allDestinations().map((d) => [d.id, d]));
  return getClusters().filter((c) => !state || c.state === state).map((c) => view(c, byId));
}

/** Draft circuits that include a destination. */
export function draftCircuitsOf(d: CmsDestination): ClusterView[] {
  const ids = new Set(d.seed?.clusters ?? []);
  if (!ids.size) return [];
  const byId = new Map(allDestinations().map((x) => [x.id, x]));
  return getClusters().filter((c) => ids.has(c.id)).map((c) => view(c, byId));
}
