import { CircuitEngine } from "@/lib/master/engine/circuits";
import { getDb, stateById } from "@/lib/master/repo";
import type { DestinationRecord } from "@/lib/master/types";
import { attractionPath } from "@/lib/master/view";
import { localNamesOf } from "@/lib/master/translation/memory";
import { publishedDestinations } from "@/lib/cms/store";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";

export type SearchIntent = "TRIP_FROM" | "TRIP_TO" | "NEARBY" | "SECTION" | "PLACE" | "NONE";

export interface SearchHit {
  kind: "destination" | "state" | "attraction" | "route" | "section" | "circuit";
  title: string;
  subtitle: string;
  /** Locale-less path; callers prefix the locale. */
  href: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  intent: SearchIntent;
  interpretation: string;
  hits: SearchHit[];
}

const SECTION_WORDS: Array<{ re: RegExp; anchor: string; label: string; path?: string }> = [
  { re: /\b(hotels?|stay|stays|accommodation|where to stay)\b/, anchor: "where-to-stay", label: "Where to stay" },
  { re: /\b(restaurants?|food|eat|eating|dishes|cuisine)\b/, anchor: "local-food", label: "Local food", path: "food" },
  { re: /\b(markets?|shopping|buy|bazaars?)\b/, anchor: "shopping", label: "Shopping", path: "shopping" },
  { re: /\b(weather|climate|temperature|rain)\b/, anchor: "weather", label: "Weather", path: "weather" },
  { re: /\b(things to do|places to visit|attractions|sightseeing|see)\b/, anchor: "top-places", label: "Top places to visit" },
  { re: /\b(history|historical|story)\b/, anchor: "story", label: "History", path: "history" },
  { re: /\b(best time|when to visit|season)\b/, anchor: "best-time", label: "Best time to visit" },
  { re: /\b(safety|safe|emergency)\b/, anchor: "safety", label: "Safety" }
];

const STOP = /\b(in|at|for|to|from|near|around|of|the|a|an|trip|tour|plan|itinerary|days?|day|places?|best|top|things|do|visit|hotels?|restaurants?|food|markets?|shopping|weather|history|stay|eat|see|nearby|and)\b/g;

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

/** 0–100 similarity of a query to a name: exact, prefix, word-prefix, substring, then typo tolerance. */
function similarity(q: string, name: string): number {
  const n = name.toLowerCase();
  if (!q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 85;
  if (n.split(/\s+/).some((w) => w.startsWith(q))) return 70;
  if (n.includes(q)) return 60;
  const d = levenshtein(q, n);
  const limit = Math.max(1, Math.floor(Math.max(q.length, 4) * 0.25));
  if (d <= limit) return 55 - d * 8;
  for (const w of n.split(/\s+/)) {
    const wd = levenshtein(q, w);
    if (w.length >= 4 && wd <= Math.max(1, Math.floor(w.length * 0.25))) return 50 - wd * 8;
  }
  return 0;
}

/** Aliases people use for tourism regions that are not a single destination record. */
const ALIASES: Record<string, string> = { kashmir: "srinagar", banaras: "varanasi", benares: "varanasi", kashi: "varanasi", allahabad: "prayagraj", bangalore: "bengaluru", mysore: "mysuru", bombay: "mumbai", calcutta: "kolkata", madras: "chennai", cochin: "kochi", ooty: "ooty", udhagamandalam: "ooty", "new delhi": "delhi" };

function findDestination(phrase: string): { dest: DestinationRecord; score: number } | null {
  const db = getDb();
  const q = (ALIASES[phrase] ?? phrase).trim();
  if (!q) return null;
  let best: { dest: DestinationRecord; score: number } | null = null;
  for (const d of db.destinations) {
    const s = Math.max(similarity(q, d.name), similarity(q, d.slug.replace(/-/g, " ")), ...d.alternate_names.map((n) => similarity(q, n)), ...localNamesOf(d.slug).map((n) => similarity(q, n)));
    if (s > 0 && (!best || s + d.popularity / 1000 > best.score + best.dest.popularity / 1000)) best = { dest: d, score: s };
  }
  return best && best.score >= 45 ? best : null;
}

function findState(phrase: string) {
  const db = getDb();
  let best: { id: string; slug: string; name: string; score: number } | null = null;
  for (const s of db.states) {
    const score = similarity(phrase, s.name);
    if (score >= 55 && (!best || score > best.score)) best = { id: s.id, slug: s.slug, name: s.name, score };
  }
  return best;
}

export function search(query: string, limit = 12): SearchResponse {
  const raw = query.trim();
  const q = raw.toLowerCase().replace(/\s+/g, " ");
  const db = getDb();
  const hits: SearchHit[] = [];
  let intent: SearchIntent = "NONE";
  let interpretation = "";
  if (!q) return { query: raw, intent, interpretation, hits };

  const dayMatch = q.match(/(\d{1,2})\s*-?\s*(?:days?|d)\b/);
  const days = dayMatch ? Math.min(21, Math.max(1, Number(dayMatch[1]))) : null;
  const cleaned = q.replace(/\d+\s*-?\s*(?:days?|d)\b/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim();
  const fromMatch = q.match(/\bfrom\s+([a-z .'-]+?)(?:\s+for\b|\s+in\b|$)/);
  const nearMatch = q.match(/\b(?:near|around|nearby)\s+([a-z .'-]+)$/);
  const section = SECTION_WORDS.find((s) => s.re.test(q));
  const phrase = (fromMatch?.[1] ?? nearMatch?.[1] ?? cleaned).replace(STOP, " ").replace(/\s+/g, " ").trim();
  const place = findDestination(phrase);
  const state = place ? null : findState(phrase);

  // -- multi-day trip starting somewhere: route suggestions
  if (days && (fromMatch || /\btrip|tour|plan|itinerary\b/.test(q)) && place && fromMatch) {
    intent = "TRIP_FROM";
    interpretation = `${days}-day trips starting from ${place.dest.name}`;
    const engine = new CircuitEngine(db);
    engine.suggestRoutes(place.dest.id, { days }, { limit: 5 }).forEach((r, i) => {
      const names = r.stops.map((s) => db.destinations.find((d) => d.id === s.destination_id)!.name);
      const circuit = r.circuit_id ? db.circuits.find((c) => c.id === r.circuit_id) : null;
      hits.push({
        kind: circuit ? "circuit" : "route",
        title: names.join(" → "),
        subtitle: `${Math.round(r.total_km)} km, about ${(r.total_minutes / 60).toFixed(1)} h of travel · ${r.days_min}–${r.days_needed} days`,
        href: circuit ? `/trips/${circuit.slug}` : `/trips?from=${place.dest.slug}&days=${days}`,
        score: 100 - i
      });
    });
    hits.push({ kind: "destination", title: `${place.dest.name} itineraries`, subtitle: `Single-destination ${days}-day plan`, href: `/itinerary/${place.dest.slug}/${clampDays(place.dest, days)}-${clampDays(place.dest, days) === 1 ? "day" : "days"}`, score: 60 });
  }
  // -- places near X
  else if (nearMatch && place) {
    intent = "NEARBY";
    interpretation = `Places connected to ${place.dest.name}`;
    db.destination_connections
      .filter((c) => c.origin_destination_id === place.dest.id || c.destination_destination_id === place.dest.id)
      .sort((a, b) => a.distance_km - b.distance_km)
      .forEach((c, i) => {
        const other = db.destinations.find((d) => d.id === (c.origin_destination_id === place.dest.id ? c.destination_destination_id : c.origin_destination_id))!;
        hits.push({ kind: "destination", title: other.name, subtitle: `${Math.round(c.distance_km)} km from ${place.dest.name}${c.road_time_minutes ? `, about ${(c.road_time_minutes / 60).toFixed(1)} h by road (estimated)` : ""}`, href: `/india/${stateById(other.state_id)!.slug}/${other.slug}`, score: 90 - i });
      });
  }
  // -- "3 day trip to X" / itinerary
  else if (days && place) {
    intent = "TRIP_TO";
    const n = clampDays(place.dest, days);
    interpretation = `${days}-day trip to ${place.dest.name}`;
    hits.push({ kind: "destination", title: `${n}-day ${place.dest.name} itinerary`, subtitle: n === days ? "Day-by-day plan with budget" : `Closest supported length to ${days} days (${place.dest.recommended_min_days}–${place.dest.recommended_max_days})`, href: `/itinerary/${place.dest.slug}/${n}-${n === 1 ? "day" : "days"}`, score: 100 });
  } else if (days && state) {
    intent = "TRIP_TO";
    interpretation = `${days}-day trip in ${state.name}`;
  }
  // -- a section of a destination page ("hotels in Goa")
  else if (section && place) {
    intent = "SECTION";
    interpretation = `${section.label} in ${place.dest.name}`;
    const base = `/india/${stateById(place.dest.state_id)!.slug}/${place.dest.slug}`;
    hits.push({ kind: "section", title: `${section.label} — ${place.dest.name}`, subtitle: place.dest.one_line_description, href: section.path ? `${base}/${section.path}` : `${base}#${section.anchor}`, score: 100 });
  } else if (place || state) {
    intent = "PLACE";
    interpretation = `Matches for “${phrase || raw}”`;
  }

  // Hits that answer the question asked (routes, itineraries, sections) always outrank plain name matches.
  hits.forEach((h) => (h.score += 1000));

  // -- generic matches (always added, so every query returns something useful)
  const seen = new Set(hits.map((h) => h.href));
  const push = (h: SearchHit) => {
    if (!seen.has(h.href)) {
      seen.add(h.href);
      hits.push(h);
    }
  };
  const needle = phrase || cleaned || q;
  for (const d of db.destinations) {
    const s = Math.max(similarity(needle, d.name), similarity(needle, ALIASES[needle] ?? ""), ...localNamesOf(d.slug).map((n) => similarity(needle, n)));
    if (s > 0) push({ kind: "destination", title: d.name, subtitle: `${stateById(d.state_id)!.name} · ${d.one_line_description}`, href: `/india/${stateById(d.state_id)!.slug}/${d.slug}`, score: s + d.popularity / 100 });
  }
  for (const s of db.states) {
    const sc = similarity(needle, s.name);
    if (sc >= 55 && db.destinations.some((d) => d.state_id === s.id)) push({ kind: "state", title: s.name, subtitle: s.type === "STATE" ? "State guide" : "Union Territory guide", href: `/india/${s.slug}`, score: sc - 1 });
  }
  for (const a of db.attractions) {
    if (a.is_hidden_gem) continue;
    const sc = similarity(needle, a.name);
    if (sc >= 55) push({ kind: "attraction", title: a.name, subtitle: `${db.destinations.find((d) => d.id === a.destination_id)!.name} · ${a.short_description}`, href: attractionPath(a), score: sc - 2 });
  }
  for (const c of db.circuits) {
    const sc = similarity(needle, c.name);
    if (sc >= 55) push({ kind: "circuit", title: c.name, subtitle: c.description, href: `/trips/${c.slug}`, score: sc - 3 });
  }
  // Database-driven destination pages and their attractions (published records only).
  bootstrapFromSeed();
  for (const d of publishedDestinations()) {
    const sc = similarity(needle, d.name);
    if (sc > 0) push({ kind: "destination", title: d.name, subtitle: `${d.state ?? "India"} · ${d.headline ?? d.short_description ?? "Destination guide"}`.slice(0, 160), href: `/destinations/${d.slug}`, score: sc - 0.5 });
    for (const a of d.attractions) {
      if (a.status !== "ACTIVE") continue;
      const as = similarity(needle, a.name);
      if (as >= 55) push({ kind: "attraction", title: a.name, subtitle: `${d.name} · ${a.short_description}`.slice(0, 160), href: `/destinations/${d.slug}#attraction-${a.slug}`, score: as - 2.5 });
    }
  }

  if (intent === "NONE" && hits.length > 0) intent = "PLACE";
  return { query: raw, intent, interpretation, hits: hits.sort((a, b) => b.score - a.score).slice(0, limit) };
}

function clampDays(d: DestinationRecord, days: number): number {
  return Math.min(d.recommended_max_days, Math.max(d.recommended_min_days, days));
}
