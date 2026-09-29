/**
 * Destination graph seed: real connection data between destinations — not
 * "same state ⇒ belongs together" (spec section 16). Distances are approximate
 * road distances entered from general knowledge and are UNVERIFIED; road times
 * are DERIVED from distance at an assumed average speed and labelled as such.
 * Edges are undirected: one row serves both directions.
 */
import type { ConnectionQuality, DestinationCategory, TransportMode } from "../enums";
import type { CircuitDestination, CircuitRecord, DestinationConnection, EntityRelationship, MasterDatabase } from "../types";
import { SRC } from "./sources";

interface Edge {
  a: string;
  b: string;
  km: number;
  hilly?: boolean;
  rail?: number; // minutes, only where well known
  air?: number;
  directTrain?: boolean;
  directBus?: boolean;
  directFlight?: boolean;
  modes?: TransportMode[];
  walking?: boolean;
  seasonalNote?: string;
}

const EDGES: Edge[] = [
  // Uttar Pradesh pilgrimage / heritage cluster
  { a: "prayagraj", b: "varanasi", km: 121, directTrain: true, directBus: true },
  { a: "varanasi", b: "sarnath", km: 10, directBus: true, modes: ["ROAD"] },
  { a: "varanasi", b: "ramnagar", km: 14, modes: ["ROAD"], seasonalNote: "A pontoon bridge operates in the dry season; the road bridge is used otherwise." },
  { a: "varanasi", b: "ayodhya", km: 200, directBus: true },
  { a: "prayagraj", b: "ayodhya", km: 165, directBus: true },
  { a: "ayodhya", b: "lucknow", km: 135, directTrain: true, directBus: true },
  { a: "lucknow", b: "varanasi", km: 286, directTrain: true, directBus: true },
  { a: "lucknow", b: "prayagraj", km: 200, directTrain: true, directBus: true },
  { a: "prayagraj", b: "agra", km: 450 },
  { a: "varanasi", b: "khajuraho", km: 415 },
  // Golden Triangle and Delhi spokes
  { a: "delhi", b: "agra", km: 233, rail: 100, directTrain: true, directBus: true },
  { a: "agra", b: "jaipur", km: 238, directTrain: true, directBus: true },
  { a: "delhi", b: "jaipur", km: 281, directTrain: true, directBus: true },
  { a: "delhi", b: "rishikesh", km: 240, hilly: false, directTrain: true, directBus: true },
  { a: "delhi", b: "amritsar", km: 450, directTrain: true, directFlight: true, air: 65, directBus: true },
  { a: "delhi", b: "manali", km: 540, hilly: true, directBus: true, seasonalNote: "Mountain roads can close in heavy snow or landslides." },
  { a: "delhi", b: "lucknow", km: 555, directTrain: true, directFlight: true, air: 65 },
  { a: "delhi", b: "varanasi", km: 820, directTrain: true, directFlight: true, air: 85 },
  { a: "delhi", b: "srinagar", km: 655, directFlight: true, air: 90, modes: ["AIR"] },
  { a: "agra", b: "khajuraho", km: 400 },
  // Rajasthan
  { a: "jaipur", b: "jodhpur", km: 337, directTrain: true, directBus: true },
  { a: "jaipur", b: "udaipur", km: 393, directTrain: true, directBus: true },
  { a: "jodhpur", b: "udaipur", km: 250, directBus: true },
  // Karnataka / Tamil Nadu / Kerala
  { a: "bengaluru", b: "mysuru", km: 145, directTrain: true, directBus: true },
  { a: "mysuru", b: "ooty", km: 125, hilly: true, directBus: true },
  { a: "bengaluru", b: "ooty", km: 270, hilly: true, directBus: true },
  { a: "kochi", b: "ooty", km: 265, hilly: true },
  { a: "kochi", b: "madurai", km: 265, directTrain: true, directBus: true, hilly: true },
  { a: "chennai", b: "madurai", km: 462, directTrain: true, directBus: true },
  { a: "chennai", b: "bengaluru", km: 350, directTrain: true, directBus: true },
  { a: "bengaluru", b: "hyderabad", km: 570, directTrain: true, directBus: true },
  // West and East
  { a: "mumbai", b: "goa", km: 590, directTrain: true, directBus: true },
  { a: "kolkata", b: "darjeeling", km: 590, hilly: true, directTrain: true },
  { a: "kolkata", b: "varanasi", km: 680, directTrain: true }
];

const ROAD_KMH = 45;
const HILL_KMH = 30;

function quality(roadMinutes: number | null, e: Edge): ConnectionQuality {
  if ((e.directTrain || e.directFlight) && (roadMinutes ?? Infinity) <= 180) return "EXCELLENT";
  if (roadMinutes !== null && roadMinutes <= 270) return "GOOD";
  if (e.directTrain || e.directFlight || (roadMinutes !== null && roadMinutes <= 480)) return "FAIR";
  return "POOR";
}

export function seedConnections(db: MasterDatabase): void {
  const bySlug = new Map(db.destinations.map((d) => [d.slug, d]));
  EDGES.forEach((e, i) => {
    const a = bySlug.get(e.a);
    const b = bySlug.get(e.b);
    if (!a || !b) throw new Error(`Connection references unknown destination: ${e.a} / ${e.b}`);
    const airOnly = e.modes?.length === 1 && e.modes[0] === "AIR";
    const road = airOnly ? null : Math.round((e.km / (e.hilly ? HILL_KMH : ROAD_KMH)) * 60);
    const modes: TransportMode[] = e.modes ?? [
      "ROAD",
      ...(e.directTrain ? (["RAIL"] as TransportMode[]) : []),
      ...(e.directBus ? (["BUS"] as TransportMode[]) : []),
      ...(e.directFlight ? (["AIR"] as TransportMode[]) : [])
    ];
    const conn: DestinationConnection = {
      id: `CONN-${String(i + 1).padStart(3, "0")}`,
      origin_destination_id: a.id,
      destination_destination_id: b.id,
      distance_km: e.km,
      road_time_minutes: road,
      rail_time_minutes: e.rail ?? null,
      bus_time_minutes: e.directBus && road ? Math.round(road * 1.15) : null,
      air_time_minutes: e.air ?? null,
      walking_possible: e.walking ?? false,
      direct_train_available: e.directTrain ?? null,
      direct_bus_available: e.directBus ?? null,
      direct_flight_available: e.directFlight ?? null,
      transport_modes: modes,
      typical_transport_cost_min: null,
      typical_transport_cost_max: null,
      connection_quality: quality(road, e),
      seasonal: Boolean(e.seasonalNote),
      seasonal_notes: [e.seasonalNote, road ? `Road time derived from distance at ~${e.hilly ? HILL_KMH : ROAD_KMH} km/h (estimate).` : null]
        .filter(Boolean)
        .join(" ") || null,
      confidence: "UNVERIFIED",
      source_id: SRC.EDITORIAL_AI,
      last_verified_at: null
    };
    db.destination_connections.push(conn);
  });
}

interface CircuitSeed {
  slug: string;
  name: string;
  description: string;
  type: CircuitRecord["circuit_type"];
  theme: string;
  stops: Array<{ slug: string; days: number; optional?: boolean }>;
  min: number;
  rec: number;
  max: number;
  roundTrip?: boolean;
  seasonStart?: number;
  seasonEnd?: number;
}

const CIRCUITS: CircuitSeed[] = [
  {
    slug: "prayagraj-varanasi", name: "Prayagraj – Varanasi – Sarnath", type: "RELIGIOUS", theme: "Ganga pilgrimage and Buddhist heritage",
    description: "The Sangam at Prayagraj, the ghats and temples of Varanasi and the Buddhist site at Sarnath — all on one short rail/road corridor of about 130 km.",
    stops: [{ slug: "prayagraj", days: 1 }, { slug: "varanasi", days: 2 }, { slug: "sarnath", days: 1, optional: true }],
    min: 3, rec: 4, max: 5, seasonStart: 10, seasonEnd: 3
  },
  {
    slug: "golden-triangle", name: "Golden Triangle: Delhi – Agra – Jaipur", type: "HERITAGE", theme: "Mughal and Rajput heritage",
    description: "India's classic first-visit route linking three heritage cities, each a few hours from the next.",
    stops: [{ slug: "delhi", days: 2 }, { slug: "agra", days: 1 }, { slug: "jaipur", days: 2 }],
    min: 4, rec: 5, max: 7, seasonStart: 10, seasonEnd: 3
  },
  {
    slug: "ayodhya-varanasi-pilgrimage", name: "Ayodhya – Prayagraj – Varanasi pilgrimage", type: "RAMAYANA", theme: "Hindu pilgrimage circuit of eastern Uttar Pradesh",
    description: "Three of Uttar Pradesh's major pilgrimage cities, linked by road and rail.",
    stops: [{ slug: "ayodhya", days: 1 }, { slug: "prayagraj", days: 1 }, { slug: "varanasi", days: 2 }],
    min: 4, rec: 5, max: 6, seasonStart: 10, seasonEnd: 3
  },
  {
    slug: "royal-rajasthan", name: "Royal Rajasthan: Jaipur – Jodhpur – Udaipur", type: "HERITAGE", theme: "Forts, palaces and lakes",
    description: "Three Rajasthani cities of forts and palaces along a 640 km route; legs are 4–7 hours by road.",
    stops: [{ slug: "jaipur", days: 2 }, { slug: "jodhpur", days: 2 }, { slug: "udaipur", days: 2 }],
    min: 6, rec: 7, max: 9, seasonStart: 10, seasonEnd: 3
  },
  {
    slug: "mysuru-bengaluru", name: "Bengaluru – Mysuru", type: "CULTURAL", theme: "Garden city and palace city",
    description: "A short trip pairing Bengaluru with the palace city of Mysuru, about 145 km apart.",
    stops: [{ slug: "bengaluru", days: 1 }, { slug: "mysuru", days: 2 }],
    min: 2, rec: 3, max: 4, seasonStart: 10, seasonEnd: 3
  },
  {
    slug: "nilgiri-hills-circuit", name: "Mysuru – Ooty hill circuit", type: "REGIONAL", theme: "Palaces and hill station",
    description: "From Mysuru's palace up through forest roads to the Nilgiri hill station of Ooty.",
    stops: [{ slug: "mysuru", days: 1 }, { slug: "ooty", days: 2 }],
    min: 3, rec: 3, max: 4, seasonStart: 4, seasonEnd: 6
  },
  {
    slug: "tamil-nadu-temple-route", name: "Chennai – Madurai temple route", type: "RELIGIOUS", theme: "Dravidian temple architecture",
    description: "Chennai's temples and the great Meenakshi Amman Temple at Madurai, about 460 km apart by road or an overnight train.",
    stops: [{ slug: "chennai", days: 2 }, { slug: "madurai", days: 2 }],
    min: 4, rec: 4, max: 5, seasonStart: 10, seasonEnd: 3
  }
];

export function seedCircuits(db: MasterDatabase): void {
  const bySlug = new Map(db.destinations.map((d) => [d.slug, d]));
  CIRCUITS.forEach((c, i) => {
    const stops = c.stops.map((s, idx) => {
      const d = bySlug.get(s.slug);
      if (!d) throw new Error(`Circuit ${c.slug} references unknown destination ${s.slug}`);
      return { d, s, idx };
    });
    const stateIds = [...new Set(stops.map((x) => x.d.state_id))];
    const circuit: CircuitRecord = {
      id: `CIRC-${String(i + 1).padStart(3, "0")}`,
      name: c.name, slug: c.slug, description: c.description, circuit_type: c.type,
      region: stops[0].d.region, states_involved: stateIds,
      minimum_days: c.min, recommended_days: c.rec, maximum_days: c.max, theme: c.theme,
      start_destination_id: stops[0].d.id, end_destination_id: stops[stops.length - 1].d.id,
      is_round_trip: c.roundTrip ?? false, season_start: c.seasonStart ?? null, season_end: c.seasonEnd ?? null,
      difficulty: "EASY", status: "DATA_COLLECTION", generated_by: "CURATED"
    };
    db.circuits.push(circuit);
    stops.forEach(({ d, s, idx }) => {
      const link: CircuitDestination = {
        circuit_id: circuit.id, destination_id: d.id, sequence_number: idx + 1,
        recommended_days: s.days, mandatory: !s.optional, optional: Boolean(s.optional)
      };
      db.circuit_destinations.push(link);
    });
  });
}

/** Derives entity_relationships from the connection graph, circuits and shared categories. */
export function deriveRelationships(db: MasterDatabase): void {
  const cats = new Map<string, Set<DestinationCategory>>();
  db.destination_categories.forEach((c) => {
    if (!cats.has(c.destination_id)) cats.set(c.destination_id, new Set());
    cats.get(c.destination_id)!.add(c.category);
  });
  const seen = new Set<string>();
  let n = 0;
  const add = (a: string, b: string, type: EntityRelationship["relationship_type"], km: number | null, minutes: number | null, priority: number) => {
    const key = [a, b].sort().join("|") + type;
    if (seen.has(key)) return;
    seen.add(key);
    n += 1;
    db.entity_relationships.push({
      id: `REL-${String(n).padStart(4, "0")}`, entity_a: a, entity_b: b, relationship_type: type,
      distance_km: km, travel_time: minutes, priority, source_id: SRC.DERIVED
    });
  };

  for (const c of db.destination_connections) {
    const a = c.origin_destination_id;
    const b = c.destination_destination_id;
    const t = c.road_time_minutes ?? c.air_time_minutes;
    const shared = [...(cats.get(a) ?? [])].filter((x) => cats.get(b)?.has(x));
    if (t !== null && t <= 240) add(a, b, "NEARBY", c.distance_km, t, 10);
    if (t !== null && t <= 300 && shared.length > 0) add(a, b, "COMBINE_WITH", c.distance_km, t, 8);
    if (c.direct_train_available || c.direct_flight_available) add(a, b, "TRANSPORT_CONNECTED", c.distance_km, t, 5);
    if (cats.get(a)?.has("PILGRIMAGE") && cats.get(b)?.has("PILGRIMAGE")) add(a, b, "RELIGIOUSLY_CONNECTED", c.distance_km, t, 6);
  }

  const byCircuit = new Map<string, CircuitDestination[]>();
  db.circuit_destinations.forEach((cd) => {
    if (!byCircuit.has(cd.circuit_id)) byCircuit.set(cd.circuit_id, []);
    byCircuit.get(cd.circuit_id)!.push(cd);
  });
  byCircuit.forEach((stops) => {
    const ordered = [...stops].sort((x, y) => x.sequence_number - y.sequence_number);
    for (let i = 0; i < ordered.length - 1; i++) add(ordered[i].destination_id, ordered[i + 1].destination_id, "PART_OF_CIRCUIT", null, null, 9);
  });

  // Same-state links are deliberately low priority: shared state alone never justifies combining places.
  const byState = new Map<string, string[]>();
  db.destinations.filter((d) => d.destination_level === "A").forEach((d) => {
    if (!byState.has(d.state_id)) byState.set(d.state_id, []);
    byState.get(d.state_id)!.push(d.id);
  });
  byState.forEach((ids) => {
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) add(ids[i], ids[j], "SAME_STATE", null, null, 1);
  });

}
