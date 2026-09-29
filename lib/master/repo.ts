import type {
  AccommodationArea, AttractionRecord, CircuitDestination, CircuitRecord, DestinationConnection,
  DestinationRecord, FactRecord, MasterDatabase, SourceRecord, StateRecord
} from "./types";
import { buildMasterDatabase } from "./seed/build";

/**
 * Read access to the master database. Today this is the in-memory database
 * built from the seed pipeline; the interface is what a Prisma-backed
 * implementation would satisfy (see prisma/schema.prisma — the models mirror
 * lib/master/types.ts one-to-one). Pages and engines only call these functions.
 */
interface Indexes {
  destById: Map<string, DestinationRecord>;
  destBySlug: Map<string, DestinationRecord>;
  stateById: Map<string, StateRecord>;
  stateBySlug: Map<string, StateRecord>;
  sourceById: Map<string, SourceRecord>;
  attractionsByDest: Map<string, AttractionRecord[]>;
  factsByEntity: Map<string, FactRecord[]>;
  circuitBySlug: Map<string, CircuitRecord>;
}

let db: MasterDatabase | null = null;
let idx: Indexes | null = null;

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  rows.forEach((r) => {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  });
  return m;
}

export function getDb(): MasterDatabase {
  if (!db) db = buildMasterDatabase();
  return db;
}

function indexes(): Indexes {
  if (idx) return idx;
  const d = getDb();
  idx = {
    destById: new Map(d.destinations.map((x) => [x.id, x])),
    destBySlug: new Map(d.destinations.map((x) => [x.slug, x])),
    stateById: new Map(d.states.map((x) => [x.id, x])),
    stateBySlug: new Map(d.states.map((x) => [x.slug, x])),
    sourceById: new Map(d.sources.map((x) => [x.id, x])),
    attractionsByDest: groupBy(d.attractions, (a) => a.destination_id),
    factsByEntity: groupBy(d.facts, (f) => f.entity_id),
    circuitBySlug: new Map(d.circuits.map((c) => [c.slug, c]))
  };
  return idx;
}

/** Test/pipeline hook: replace the database (e.g. after an import run) and drop cached indexes. */
export function setDb(next: MasterDatabase): void {
  db = next;
  idx = null;
}

export const destinationById = (id: string) => indexes().destById.get(id);
export const destinationBySlug = (slug: string) => indexes().destBySlug.get(slug);
export const stateById = (id: string) => indexes().stateById.get(id);
export const stateBySlug = (slug: string) => indexes().stateBySlug.get(slug);
export const sourceById = (id: string) => indexes().sourceById.get(id);
export const circuitBySlug = (slug: string) => indexes().circuitBySlug.get(slug);
export const factsFor = (entityId: string): FactRecord[] => indexes().factsByEntity.get(entityId) ?? [];
export const attractionsOf = (destId: string): AttractionRecord[] => indexes().attractionsByDest.get(destId) ?? [];

export const childrenOf = (destId: string): DestinationRecord[] =>
  getDb().destinations.filter((d) => d.parent_destination_id === destId);

export const destinationsOfState = (stateId: string): DestinationRecord[] =>
  getDb().destinations.filter((d) => d.state_id === stateId).sort((a, b) => b.popularity - a.popularity);

export const majorDestinations = (): DestinationRecord[] =>
  getDb().destinations.filter((d) => d.destination_level === "A").sort((a, b) => b.popularity - a.popularity);

export const areasOf = (destId: string): AccommodationArea[] =>
  getDb().accommodation_areas.filter((a) => a.destination_id === destId);

export function connectionsOf(destId: string): DestinationConnection[] {
  return getDb().destination_connections.filter(
    (c) => c.origin_destination_id === destId || c.destination_destination_id === destId
  );
}

export function circuitsContaining(destId: string): Array<{ circuit: CircuitRecord; stops: CircuitDestination[] }> {
  const d = getDb();
  const ids = new Set(d.circuit_destinations.filter((cd) => cd.destination_id === destId).map((cd) => cd.circuit_id));
  return d.circuits
    .filter((c) => ids.has(c.id))
    .map((circuit) => ({
      circuit,
      stops: d.circuit_destinations.filter((cd) => cd.circuit_id === circuit.id).sort((a, b) => a.sequence_number - b.sequence_number)
    }));
}

export const stateSlugOf = (dest: DestinationRecord): string => stateById(dest.state_id)?.slug ?? "india";
