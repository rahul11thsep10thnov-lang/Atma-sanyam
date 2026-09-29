import type { TransportMode } from "../enums";
import { haversineKm } from "../seed/parsers";
import type { DestinationConnection, DestinationRecord, MasterDatabase } from "../types";

export interface Edge {
  a: string;
  b: string;
  connection: DestinationConnection;
}

export type TravelPreference = "FASTEST" | "BUDGET";

export interface Leg {
  from: string;
  to: string;
  distance_km: number;
  minutes: number;
  mode: TransportMode;
  connection: DestinationConnection;
  /** True when the time is derived (road time from distance) rather than a reported value. */
  estimated: boolean;
}

/**
 * The destination graph (spec section 16). Nodes are destinations; edges are
 * rows of `destination_connections`, treated as undirected. Nothing here knows
 * about states or "regions" — two places are only adjacent if a connection
 * record says they are.
 */
export class DestinationGraph {
  readonly nodes: Map<string, DestinationRecord>;
  private adjacency = new Map<string, Edge[]>();

  constructor(db: MasterDatabase) {
    this.nodes = new Map(db.destinations.map((d) => [d.id, d]));
    for (const c of db.destination_connections) {
      const a = c.origin_destination_id;
      const b = c.destination_destination_id;
      if (!this.nodes.has(a) || !this.nodes.has(b)) continue;
      this.push(a, { a, b, connection: c });
      this.push(b, { a: b, b: a, connection: c });
    }
  }

  private push(id: string, e: Edge) {
    const list = this.adjacency.get(id);
    if (list) list.push(e);
    else this.adjacency.set(id, [e]);
  }

  neighbors(id: string): Edge[] {
    return this.adjacency.get(id) ?? [];
  }

  edge(a: string, b: string): Edge | undefined {
    return this.neighbors(a).find((e) => e.b === b);
  }

  /**
   * The best available way to make a leg. FASTEST picks the smallest reported
   * time; BUDGET prefers rail/bus/road over air and only flies when nothing else exists.
   */
  leg(from: string, to: string, pref: TravelPreference = "FASTEST"): Leg | null {
    const e = this.edge(from, to);
    if (!e) return null;
    const c = e.connection;
    const options: Array<{ mode: TransportMode; minutes: number; estimated: boolean }> = [];
    if (c.rail_time_minutes !== null) options.push({ mode: "RAIL", minutes: c.rail_time_minutes, estimated: false });
    if (c.road_time_minutes !== null) options.push({ mode: "ROAD", minutes: c.road_time_minutes, estimated: true });
    if (c.bus_time_minutes !== null) options.push({ mode: "BUS", minutes: c.bus_time_minutes, estimated: true });
    if (c.air_time_minutes !== null) options.push({ mode: "AIR", minutes: c.air_time_minutes + 150, estimated: false }); // + airport overheads
    if (options.length === 0) return null;

    const ground = options.filter((o) => o.mode !== "AIR");
    const pool = pref === "BUDGET" && ground.length > 0 ? ground : options;
    const best = pool.reduce((x, y) => (y.minutes < x.minutes ? y : x));
    return { from, to, distance_km: c.distance_km, minutes: best.minutes, mode: best.mode, connection: c, estimated: best.estimated };
  }

  /** Dijkstra over travel minutes. Returns the leg sequence, or null if the places are not connected. */
  shortestPath(from: string, to: string, pref: TravelPreference = "FASTEST"): Leg[] | null {
    if (from === to) return [];
    const dist = new Map<string, number>([[from, 0]]);
    const prev = new Map<string, Leg>();
    const open = new Set<string>([from]);
    while (open.size > 0) {
      let current: string | null = null;
      let best = Infinity;
      for (const id of open) {
        const d = dist.get(id) ?? Infinity;
        if (d < best) {
          best = d;
          current = id;
        }
      }
      if (current === null) break;
      open.delete(current);
      if (current === to) break;
      for (const e of this.neighbors(current)) {
        const leg = this.leg(current, e.b, pref);
        if (!leg) continue;
        const nd = best + leg.minutes;
        if (nd < (dist.get(e.b) ?? Infinity)) {
          dist.set(e.b, nd);
          prev.set(e.b, leg);
          open.add(e.b);
        }
      }
    }
    if (!prev.has(to)) return null;
    const path: Leg[] = [];
    for (let cur = to; cur !== from; ) {
      const leg = prev.get(cur)!;
      path.unshift(leg);
      cur = leg.from;
    }
    return path;
  }

  straightLineKm(a: string, b: string): number {
    const x = this.nodes.get(a);
    const y = this.nodes.get(b);
    if (!x || !y) return 0;
    return haversineKm(x.latitude, x.longitude, y.latitude, y.longitude);
  }
}
