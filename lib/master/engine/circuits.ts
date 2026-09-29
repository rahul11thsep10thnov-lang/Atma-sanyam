import type { DestinationCategory, TravellerType } from "../enums";
import { monthInRange } from "../seed/parsers";
import type { CircuitRecord, DestinationRecord, MasterDatabase } from "../types";
import { DestinationGraph, type Leg } from "./graph";

/**
 * Circuit engine (spec sections 17–19). Decides whether destinations belong
 * together from DISTANCE + TRAVEL TIME + TRANSPORT AVAILABILITY + DIRECTION +
 * TRIP LENGTH + DESTINATION TYPE + SEASON + TRAVELLER PREFERENCE.
 * Sharing a state is deliberately worth nothing.
 */

export interface RouteContext {
  days: number;
  traveller_type?: TravellerType;
  interests?: DestinationCategory[];
  month?: number;
}

export interface LegAssessment {
  from: string;
  to: string;
  distance_km: number;
  minutes: number;
  mode: Leg["mode"];
  estimated: boolean;
  max_minutes: number;
  /** Too long for this trip length: shown as a separate, longer route rather than a combination. */
  extended: boolean;
  score: number;
  components: { time: number; transport: number; quality: number; theme: number; season: number };
  reasons: string[];
}

export interface RouteStop {
  destination_id: string;
  days: number;
}

export interface RouteSuggestion {
  stops: RouteStop[];
  legs: LegAssessment[];
  total_minutes: number;
  total_km: number;
  /** Days at the recommended pace. */
  days_needed: number;
  /** Fewest days that still make sense (sum of each stop's minimum + travel overhead). */
  days_min: number;
  directness: number;
  score: number;
  reasons: string[];
  circuit_id: string | null;
}

/** Longest single leg worth combining, by trip length — long legs only make sense on long trips. */
export function maxLegMinutes(tripDays: number, traveller: TravellerType = "ANY"): number {
  const base = tripDays <= 3 ? 270 : tripDays <= 5 ? 360 : tripDays <= 8 ? 480 : 720;
  return traveller === "ELDERLY" || traveller === "FAMILY" ? Math.round(base * 0.8) : base;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export class CircuitEngine {
  private categories = new Map<string, Set<DestinationCategory>>();
  readonly graph: DestinationGraph;

  constructor(private db: MasterDatabase, graph?: DestinationGraph) {
    this.graph = graph ?? new DestinationGraph(db);
    for (const c of db.destination_categories) {
      if (!this.categories.has(c.destination_id)) this.categories.set(c.destination_id, new Set());
      this.categories.get(c.destination_id)!.add(c.category);
    }
  }

  categoriesOf(id: string): Set<DestinationCategory> {
    return this.categories.get(id) ?? new Set();
  }

  private themeScore(a: string, b: string, interests: DestinationCategory[] = []): number {
    const ca = this.categoriesOf(a);
    const cb = this.categoriesOf(b);
    if (ca.size === 0 || cb.size === 0) return 0.4;
    const inter = [...ca].filter((x) => cb.has(x)).length;
    const union = new Set([...ca, ...cb]).size;
    const jaccard = inter / union;
    if (interests.length === 0) return jaccard;
    const wanted = new Set(interests);
    const match = ([...ca].some((x) => wanted.has(x)) ? 0.5 : 0) + ([...cb].some((x) => wanted.has(x)) ? 0.5 : 0);
    return 0.5 * jaccard + 0.5 * match;
  }

  private seasonScore(a: DestinationRecord, b: DestinationRecord, month?: number): number {
    const monthsOf = (d: DestinationRecord) => {
      const set = new Set<number>();
      for (let m = 1; m <= 12; m++) if (monthInRange(m, d.best_month_start, d.best_month_end)) set.add(m);
      return set;
    };
    if (!a.best_month_start || !b.best_month_start) return 0.6; // unknown season: neutral, not a penalty
    const overlap = [...monthsOf(a)].filter((m) => monthsOf(b).has(m)).length;
    let score = clamp01(overlap / 6);
    if (month) {
      const ok = monthInRange(month, a.best_month_start, a.best_month_end) && monthInRange(month, b.best_month_start, b.best_month_end);
      score = ok ? Math.max(score, 0.9) : score * 0.4;
    }
    return score;
  }

  assessLeg(from: string, to: string, ctx: RouteContext): LegAssessment | null {
    const a = this.graph.nodes.get(from);
    const b = this.graph.nodes.get(to);
    const leg = this.graph.leg(from, to, ctx.traveller_type === "ELDERLY" ? "FASTEST" : "BUDGET");
    if (!a || !b || !leg) return null;

    const max = maxLegMinutes(ctx.days, ctx.traveller_type);
    const c = leg.connection;
    const time = clamp01(1 - leg.minutes / max);
    const transport = c.direct_train_available || c.direct_flight_available ? 1 : c.direct_bus_available ? 0.8 : c.transport_modes.length > 0 ? 0.5 : 0.3;
    const quality = { EXCELLENT: 1, GOOD: 0.8, FAIR: 0.5, POOR: 0.2, UNKNOWN: 0.4 }[c.connection_quality];
    const theme = this.themeScore(from, to, ctx.interests);
    const season = this.seasonScore(a, b, ctx.month);
    const extended = leg.minutes > max;
    const score = extended ? 0 : 0.4 * time + 0.2 * transport + 0.15 * quality + 0.15 * theme + 0.1 * season;

    const hours = (leg.minutes / 60).toFixed(1);
    const reasons = [
      `${Math.round(c.distance_km)} km, about ${hours} h by ${leg.mode.toLowerCase()}${leg.estimated ? " (estimated)" : ""}`,
      extended
        ? `longer than the ${(max / 60).toFixed(1)} h limit for a ${ctx.days}-day trip — better planned as a separate route`
        : `within the ${(max / 60).toFixed(1)} h limit for a ${ctx.days}-day trip`
    ];
    if (c.direct_train_available) reasons.push("direct trains reported");
    else if (c.direct_flight_available) reasons.push("direct flights reported");
    else if (c.direct_bus_available) reasons.push("direct buses reported");
    if (theme >= 0.4) reasons.push("similar travel themes");

    return {
      from, to, distance_km: c.distance_km, minutes: leg.minutes, mode: leg.mode, estimated: leg.estimated,
      max_minutes: max, extended, score, components: { time, transport, quality, theme, season }, reasons
    };
  }

  /** Scores an ordered list of destinations as a single trip. Returns null if any leg has no connection. */
  scoreRoute(ids: string[], ctx: RouteContext): RouteSuggestion | null {
    const legs: LegAssessment[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      const leg = this.assessLeg(ids[i], ids[i + 1], ctx);
      if (!leg) return null;
      legs.push(leg);
    }
    const stops: RouteStop[] = ids.map((id) => ({ destination_id: id, days: this.graph.nodes.get(id)!.recommended_days }));
    const total_minutes = legs.reduce((s, l) => s + l.minutes, 0);
    const total_km = legs.reduce((s, l) => s + l.distance_km, 0);
    const overhead = legs.filter((l) => l.minutes > 240).length * 0.5;
    const days_needed = stops.reduce((s, x) => s + x.days, 0) + overhead;
    const days_min = ids.reduce((s, id) => s + this.graph.nodes.get(id)!.recommended_min_days, 0) + overhead;

    const straight = ids.length > 2 ? this.graph.straightLineKm(ids[0], ids[ids.length - 1]) : total_km;
    const directness = ids.length > 2 && total_km > 0 ? clamp01(straight / total_km) : 1;
    const legScore = legs.length ? legs.reduce((s, l) => s + l.score, 0) / legs.length : 0;
    const anyExtended = legs.some((l) => l.extended);
    const fit = days_min > ctx.days + 0.5 ? 0 : days_needed <= ctx.days ? 1 : Math.max(0.4, ctx.days / days_needed);
    const interest = ctx.interests?.length
      ? ids.filter((id) => [...this.categoriesOf(id)].some((c) => ctx.interests!.includes(c))).length / ids.length
      : 1;

    const score = anyExtended ? 0 : legScore * (0.5 + 0.5 * directness) * fit * (0.6 + 0.4 * interest);
    const names = ids.map((id) => this.graph.nodes.get(id)!.name).join(" → ");
    const reasons = [
      `${names}: ${Math.round(total_km)} km in total, about ${(total_minutes / 60).toFixed(1)} h of travel`,
      `${days_needed} days at the recommended pace, ${days_min} at the minimum (trip is ${ctx.days} days)`
    ];
    if (directness < 0.75 && ids.length > 2) reasons.push("route doubles back on itself");

    return { stops, legs, total_minutes, total_km, days_needed, days_min, directness, score, reasons, circuit_id: this.matchCircuit(ids) };
  }

  private matchCircuit(ids: string[]): string | null {
    const key = [...ids].sort().join("|");
    for (const c of this.db.circuits) {
      const stops = this.db.circuit_destinations.filter((cd) => cd.circuit_id === c.id && cd.mandatory).map((cd) => cd.destination_id);
      if ([...stops].sort().join("|") === key) return c.id;
    }
    return null;
  }

  /**
   * Suggests multi-city routes starting at `start` that fit `ctx.days`.
   * Depth-first search over the graph, pruning legs that are too long for the trip.
   */
  suggestRoutes(start: string, ctx: RouteContext, opts: { maxStops?: number; limit?: number } = {}): RouteSuggestion[] {
    const maxStops = opts.maxStops ?? 4;
    const limit = opts.limit ?? 5;
    const results: RouteSuggestion[] = [];
    const startNode = this.graph.nodes.get(start);
    if (!startNode) return [];

    const walk = (path: string[]) => {
      if (path.length >= 2) {
        const scored = this.scoreRoute(path, ctx);
        if (scored && scored.score > 0) results.push(scored);
      }
      if (path.length >= maxStops) return;
      const last = path[path.length - 1];
      for (const e of this.graph.neighbors(last)) {
        const next = this.graph.nodes.get(e.b);
        if (!next || path.includes(e.b)) continue;
        if (next.parent_destination_id === last || this.graph.nodes.get(last)?.parent_destination_id === e.b) continue; // add-ons, not stops
        const leg = this.assessLeg(last, e.b, ctx);
        if (!leg || leg.extended) continue;
        walk([...path, e.b]);
      }
    };
    walk([start]);

    const seen = new Set<string>();
    return results
      .sort((a, b) => b.score - a.score || a.total_minutes - b.total_minutes)
      .filter((r) => {
        const key = [...r.stops.map((s) => s.destination_id)].sort().join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  }

  /** Generated circuit candidates for the admin "Circuits" view (not persisted). */
  generateCandidates(tripDays = 5): CircuitRecord[] {
    const out: CircuitRecord[] = [];
    const seen = new Set<string>(this.db.circuits.map((c) => [c.start_destination_id, c.end_destination_id].sort().join("|")));
    for (const d of this.db.destinations.filter((x) => x.destination_level === "A")) {
      const best = this.suggestRoutes(d.id, { days: tripDays }, { limit: 1, maxStops: 3 })[0];
      if (!best || best.stops.length < 2 || best.circuit_id) continue;
      const first = best.stops[0].destination_id;
      const last = best.stops[best.stops.length - 1].destination_id;
      const key = [first, last].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const names = best.stops.map((s) => this.graph.nodes.get(s.destination_id)!.name);
      out.push({
        id: `CIRC-GEN-${out.length + 1}`, name: names.join(" – "), slug: names.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: best.reasons[0], circuit_type: "REGIONAL", region: this.graph.nodes.get(first)!.region,
        states_involved: [...new Set(best.stops.map((s) => this.graph.nodes.get(s.destination_id)!.state_id))],
        minimum_days: Math.ceil(best.days_min), recommended_days: Math.ceil(best.days_needed) + 1, maximum_days: Math.ceil(best.days_needed) + 3,
        theme: "Engine-suggested route", start_destination_id: first, end_destination_id: last, is_round_trip: false,
        season_start: null, season_end: null, difficulty: "EASY", status: "DRAFT", generated_by: "ENGINE"
      });
    }
    return out;
  }
}
