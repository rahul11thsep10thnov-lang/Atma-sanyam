import {
  CONFIDENCE_LEVELS, CONTENT_STATUSES, DESTINATION_CATEGORIES, ENTITY_TYPES
} from "../enums";
import { idKind } from "../ids";
import { timeToMinutes } from "../seed/parsers";
import type { MasterDatabase } from "../types";

export interface Issue {
  severity: "ERROR" | "WARNING";
  table: string;
  id: string;
  message: string;
}

const INDIA = { latMin: 6, latMax: 37.5, lngMin: 68, lngMax: 98 };

/** Referential-integrity and data-quality checks over the whole master database. */
export function validateDatabase(db: MasterDatabase): Issue[] {
  const issues: Issue[] = [];
  const err = (table: string, id: string, message: string) => issues.push({ severity: "ERROR", table, id, message });
  const warn = (table: string, id: string, message: string) => issues.push({ severity: "WARNING", table, id, message });

  const states = new Set(db.states.map((s) => s.id));
  const dests = new Map(db.destinations.map((d) => [d.id, d]));
  const sources = new Set(db.sources.map((s) => s.id));
  const periods = new Set(db.historical_periods.map((p) => p.id));
  const attractionIds = new Set(db.attractions.map((a) => a.id));

  const unique = (table: string, ids: string[]) => {
    const seen = new Set<string>();
    ids.forEach((id) => {
      if (seen.has(id)) err(table, id, "duplicate id");
      seen.add(id);
    });
  };
  unique("states", db.states.map((s) => s.id));
  unique("destinations", db.destinations.map((s) => s.id));
  unique("attractions", db.attractions.map((s) => s.id));
  unique("facts", db.facts.map((s) => s.id));

  const src = (table: string, id: string, sourceId: string | null) => {
    if (sourceId && !sources.has(sourceId)) err(table, id, `unknown source_id ${sourceId}`);
    if (!sourceId) warn(table, id, "no source_id — every record should be traceable");
  };

  db.states.forEach((s) => {
    if (idKind(s.id) !== "STATE") err("states", s.id, "id is not a valid state id (IN-XX)");
  });

  db.destinations.forEach((d) => {
    if (idKind(d.id) !== "DESTINATION") err("destinations", d.id, "id is not a valid destination id (IN-XX-CODE)");
    if (!states.has(d.state_id)) err("destinations", d.id, `unknown state ${d.state_id}`);
    else if (!d.id.startsWith(`${d.state_id}-`)) err("destinations", d.id, "id prefix does not match state_id");
    if (d.parent_destination_id && !dests.has(d.parent_destination_id)) err("destinations", d.id, `unknown parent ${d.parent_destination_id}`);
    if (d.latitude < INDIA.latMin || d.latitude > INDIA.latMax || d.longitude < INDIA.lngMin || d.longitude > INDIA.lngMax) {
      err("destinations", d.id, `coordinates (${d.latitude}, ${d.longitude}) are outside India`);
    }
    if (!(d.recommended_min_days <= d.recommended_days && d.recommended_days <= d.recommended_max_days)) {
      err("destinations", d.id, "recommended days must satisfy min ≤ recommended ≤ max");
    }
    if (!ENTITY_TYPES.includes(d.entity_type)) err("destinations", d.id, `invalid entity_type ${d.entity_type}`);
    if (!CONTENT_STATUSES.includes(d.status)) err("destinations", d.id, `invalid status ${d.status}`);
    if (d.destination_level === "B" && !d.parent_destination_id) warn("destinations", d.id, "level-B destination has no parent");
    src("destinations", d.id, d.source_id);
  });

  db.destination_categories.forEach((c) => {
    if (!dests.has(c.destination_id)) err("destination_categories", c.destination_id, "unknown destination");
    if (!DESTINATION_CATEGORIES.includes(c.category)) err("destination_categories", c.destination_id, `invalid category ${c.category}`);
  });

  db.attractions.forEach((a) => {
    if (idKind(a.id) !== "ATTRACTION") err("attractions", a.id, "id is not a valid attraction id");
    if (!dests.has(a.destination_id)) err("attractions", a.id, `unknown destination ${a.destination_id}`);
    else if (!a.id.startsWith(`${a.destination_id}-`)) err("attractions", a.id, "id prefix does not match destination_id");
    if (a.opening_time && a.closing_time && timeToMinutes(a.opening_time) >= timeToMinutes(a.closing_time)) {
      err("attractions", a.id, "opening_time must be before closing_time");
    }
    if ((a.average_visit_minutes ?? 0) > 0 && (a.minimum_visit_minutes ?? 0) > (a.average_visit_minutes ?? 0)) {
      err("attractions", a.id, "minimum_visit_minutes exceeds average_visit_minutes");
    }
    src("attractions", a.id, a.source_id);
  });

  db.historical_events.forEach((e) => {
    if (!periods.has(e.period_id)) err("historical_events", e.id, `unknown period ${e.period_id}`);
    if (!dests.has(e.entity_id) && !attractionIds.has(e.entity_id)) err("historical_events", e.id, `unknown entity ${e.entity_id}`);
  });
  db.traditions.forEach((t) => {
    if (!dests.has(t.entity_id) && !attractionIds.has(t.entity_id)) err("traditions", t.id, `unknown entity ${t.entity_id}`);
  });

  db.destination_connections.forEach((c) => {
    if (!dests.has(c.origin_destination_id) || !dests.has(c.destination_destination_id)) err("destination_connections", c.id, "references an unknown destination");
    if (c.origin_destination_id === c.destination_destination_id) err("destination_connections", c.id, "self-connection");
    if (c.distance_km <= 0) err("destination_connections", c.id, "distance_km must be positive");
  });
  const edgeKeys = new Set<string>();
  db.destination_connections.forEach((c) => {
    const key = [c.origin_destination_id, c.destination_destination_id].sort().join("|");
    if (edgeKeys.has(key)) err("destination_connections", c.id, "duplicate edge (connections are undirected: one row per pair)");
    edgeKeys.add(key);
  });

  db.circuit_destinations.forEach((cd) => {
    if (!db.circuits.some((c) => c.id === cd.circuit_id)) err("circuit_destinations", cd.circuit_id, "unknown circuit");
    if (!dests.has(cd.destination_id)) err("circuit_destinations", cd.circuit_id, `unknown destination ${cd.destination_id}`);
  });

  db.facts.forEach((f) => {
    if (!sources.has(f.source_id)) err("facts", f.id, `unknown source_id ${f.source_id}`);
    if (!CONFIDENCE_LEVELS.includes(f.confidence)) err("facts", f.id, `invalid confidence ${f.confidence}`);
    if (!dests.has(f.entity_id) && !attractionIds.has(f.entity_id)) warn("facts", f.id, `entity ${f.entity_id} not found`);
    if (f.confidence === "VERIFIED" && !f.verified_at) err("facts", f.id, "VERIFIED fact without verified_at");
  });

  db.accommodation_areas.forEach((a) => {
    if (!dests.has(a.destination_id)) err("accommodation_areas", a.id, "unknown destination");
  });
  db.local_foods.forEach((f) => {
    if (!dests.has(f.destination_id)) err("local_foods", f.id, "unknown destination");
  });
  db.destination_weather.forEach((w) => {
    if (w.month < 1 || w.month > 12) err("destination_weather", w.destination_id, `invalid month ${w.month}`);
    if (w.avg_min_temperature > w.avg_max_temperature) err("destination_weather", w.destination_id, "min temperature exceeds max");
  });
  db.emergency_services.forEach((e) => {
    if (e.scope === "LOCAL" && !e.destination_id) err("emergency_services", e.id, "LOCAL service without destination_id");
  });

  return issues;
}
