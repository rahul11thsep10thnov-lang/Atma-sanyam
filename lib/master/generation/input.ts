import type { MasterDatabase } from "../types";
import type { GenerationInput } from "./types";

/** Small deterministic hash (FNV-1a) — used as the `source_data_version` so pages regenerate only when their data changes. */
export function hashString(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildGenerationInput(db: MasterDatabase, destinationId: string): GenerationInput {
  const dest = db.destinations.find((d) => d.id === destinationId);
  if (!dest) throw new Error(`Unknown destination ${destinationId}`);
  const state = db.states.find((s) => s.id === dest.state_id)!;
  const parent = dest.parent_destination_id ? db.destinations.find((d) => d.id === dest.parent_destination_id) ?? null : null;
  const children = db.destinations.filter((d) => d.parent_destination_id === dest.id);
  const scope = new Set<string>([dest.id, ...children.map((c) => c.id)]);
  const nameOf = (id: string): string =>
    db.destinations.find((d) => d.id === id)?.name ?? db.attractions.find((a) => a.id === id)?.name ?? id;

  const attractionsAll = db.attractions.filter((a) => scope.has(a.destination_id));
  const attractionIds = new Set(attractionsAll.map((a) => a.id));
  const inScope = (entityId: string) => scope.has(entityId) || attractionIds.has(entityId);
  const periodName = new Map(db.historical_periods.map((p) => [p.id, p.name]));

  const facts = db.facts.filter((f) => inScope(f.entity_id));
  const bestKnownFor = facts.filter((f) => f.fact_type === "best_known_for" && f.entity_id === dest.id).map((f) => String(f.value));
  const transportNotes = facts.filter((f) => f.fact_type.startsWith("transport.") && f.entity_id === dest.id);

  const history = db.historical_events
    .filter((e) => inScope(e.entity_id))
    .map((e) => ({ ...e, period_name: periodName.get(e.period_id) ?? e.period_id, entity_name: nameOf(e.entity_id) }));
  const periodOrder = new Map(db.historical_periods.map((p) => [p.id, p.start_year]));
  history.sort((a, b) => (periodOrder.get(a.period_id) ?? 0) - (periodOrder.get(b.period_id) ?? 0) || a.id.localeCompare(b.id, undefined, { numeric: true }));

  const nearby = db.destination_connections
    .filter((c) => c.origin_destination_id === dest.id || c.destination_destination_id === dest.id)
    .map((connection) => {
      const otherId = connection.origin_destination_id === dest.id ? connection.destination_destination_id : connection.origin_destination_id;
      const other = db.destinations.find((d) => d.id === otherId)!;
      const otherState = db.states.find((s) => s.id === other.state_id)!;
      return { destination: { id: other.id, name: other.name, slug: other.slug, state_slug: otherState.slug }, connection };
    })
    .sort((a, b) => a.connection.distance_km - b.connection.distance_km);

  const circuits = db.circuits
    .filter((c) => db.circuit_destinations.some((cd) => cd.circuit_id === c.id && cd.destination_id === dest.id))
    .map((circuit) => ({
      circuit,
      stops: db.circuit_destinations
        .filter((cd) => cd.circuit_id === circuit.id)
        .sort((a, b) => a.sequence_number - b.sequence_number)
        .map((cd) => ({ id: cd.destination_id, name: nameOf(cd.destination_id), days: cd.recommended_days }))
    }));

  const emergencyAll = db.emergency_services.filter((e) => e.destination_id === null || e.destination_id === dest.id);
  const descriptions = Object.fromEntries(
    db.destination_descriptions.filter((d) => d.destination_id === dest.id && d.language === "en").map((d) => [d.description_type, d.content])
  );

  const days: GenerationInput["itineraries"] = [];
  for (let n = dest.recommended_min_days; n <= dest.recommended_max_days; n++) {
    days.push({ days: n, slug: `${dest.slug}-${n}-${n === 1 ? "day" : "days"}` });
  }

  const sources = new Set<string>();
  const collect = (rows: Array<{ source_id: string | null }>) => rows.forEach((r) => r.source_id && sources.add(r.source_id));
  collect([dest]);
  collect(attractionsAll);
  collect(db.local_foods.filter((f) => f.destination_id === dest.id));
  collect(facts);
  const areas = db.accommodation_areas.filter((a) => a.destination_id === dest.id);
  collect(areas);

  const foods = db.local_foods.filter((f) => f.destination_id === dest.id);
  const shopping = db.shopping.filter((s) => s.destination_id === dest.id);
  const weather = db.destination_weather.filter((w) => w.destination_id === dest.id).sort((a, b) => a.month - b.month);
  const festivals = db.festivals.filter((f) => f.destination_id === dest.id);
  const hubs = db.transport_hubs.filter((h) => h.destination_id === dest.id);
  const traditions = db.traditions.filter((t) => inScope(t.entity_id)).map((t) => ({ ...t, entity_name: nameOf(t.entity_id) }));

  const gaps: string[] = [];
  if (history.length === 0) gaps.push("No dated historical events collected");
  if (traditions.length === 0) gaps.push("No traditions or legends collected");
  if (areas.length === 0) gaps.push("No accommodation areas collected");
  if (weather.length === 0) gaps.push("No monthly climate data collected");
  if (foods.length === 0) gaps.push("No local foods collected");
  if (shopping.length === 0) gaps.push("No shopping records collected");
  if (festivals.length === 0) gaps.push("No festivals collected");
  if (hubs.length === 0 && !parent) gaps.push("No transport hubs collected");
  if (!dest.ancient_story_short) gaps.push("No ancient story collected");
  if (attractionsAll.some((a) => !a.opening_time)) gaps.push("Opening times missing for some attractions");
  if (attractionsAll.some((a) => a.entry_fee === null && a.entry_required !== false)) gaps.push("Entry fees missing for some attractions");
  if (!emergencyAll.some((e) => e.scope === "LOCAL")) gaps.push("No local emergency contacts collected");
  const cats = db.destination_categories.filter((c) => c.destination_id === dest.id).map((c) => c.category);

  const input: GenerationInput = {
    destination: {
      id: dest.id, slug: dest.slug, name: dest.name, level: dest.destination_level, entity_type: dest.entity_type,
      destination_type: dest.destination_type, state: { id: state.id, slug: state.slug, name: state.name },
      district: dest.district_id ? db.districts.find((d) => d.id === dest.district_id)?.name ?? null : null,
      parent: parent ? { id: parent.id, name: parent.name, slug: parent.slug } : null,
      coordinates: { latitude: dest.latitude, longitude: dest.longitude }, tagline: dest.tagline,
      one_line_description: dest.one_line_description, short_description: dest.short_description,
      best_months: { start: dest.best_month_start, end: dest.best_month_end, text: dest.best_time_text },
      recommended_days: { min: dest.recommended_min_days, recommended: dest.recommended_days, max: dest.recommended_max_days },
      ideal_duration_text: dest.ideal_duration_text, budget_category: dest.budget_category,
      languages: [dest.primary_language, ...dest.secondary_languages].filter((l): l is string => Boolean(l)),
      best_known_for: bestKnownFor, elevation: dest.elevation
    },
    categories: cats,
    descriptions,
    ancient_story: dest.ancient_story_short
      ? { title: dest.ancient_story_title, short: dest.ancient_story_short, long: dest.ancient_story_long, status: dest.ancient_story_status }
      : null,
    history,
    periods: db.historical_periods,
    traditions,
    attractions: attractionsAll.filter((a) => !a.is_hidden_gem),
    hidden_places: attractionsAll.filter((a) => a.is_hidden_gem),
    child_destinations: children.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    transport: { hubs, notes: transportNotes },
    accommodation_areas: areas,
    food: foods,
    shopping,
    weather,
    festivals,
    practical_information: db.practical_information.filter((p) => p.destination_id === dest.id),
    emergency: { national: emergencyAll.filter((e) => e.scope === "NATIONAL"), local: emergencyAll.filter((e) => e.scope === "LOCAL") },
    experiences: db.experiences.filter((e) => e.destination_id === dest.id),
    suitability: db.destination_suitability.find((s) => s.destination_id === dest.id) ?? null,
    costs: db.travel_costs.filter((c) => c.destination_id === null || c.destination_id === dest.id),
    nearby_destinations: nearby,
    circuits,
    itineraries: days,
    sources: db.sources.filter((s) => sources.has(s.id)),
    gaps,
    data_version: ""
  };
  input.data_version = hashString(JSON.stringify({ ...input, data_version: "" }));
  return input;
}
