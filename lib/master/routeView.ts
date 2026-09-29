import type { RouteCardData } from "@/components/plan/RouteCard";
import { CircuitEngine, type RouteSuggestion } from "./engine/circuits";
import { getDb } from "./repo";
import type { DestinationCategory, TravellerType } from "./enums";

/** Converts engine output into plain, serialisable card data (server-side only). */
export function routeCards(routes: RouteSuggestion[]): RouteCardData[] {
  const db = getDb();
  const name = (id: string) => db.destinations.find((d) => d.id === id)?.name ?? id;
  const slug = (id: string) => db.destinations.find((d) => d.id === id)?.slug ?? id;
  return routes.map((r) => {
    const circuit = r.circuit_id ? db.circuits.find((c) => c.id === r.circuit_id) : null;
    return {
      title: circuit?.name ?? r.stops.map((s) => name(s.destination_id)).join(" → "),
      stops: r.stops.map((s) => ({ name: name(s.destination_id), days: s.days })),
      km: r.total_km,
      travelHours: r.total_minutes / 60,
      daysMin: r.days_min,
      daysNeeded: r.days_needed,
      reasons: r.reasons,
      legs: r.legs.map((l) => ({ from: name(l.from), to: name(l.to), km: l.distance_km, hours: l.minutes / 60, mode: l.mode, estimated: l.estimated, extended: l.extended })),
      href: circuit ? `/trips/${circuit.slug}` : `/trips/route?stops=${r.stops.map((s) => `${slug(s.destination_id)}:${s.days}`).join(",")}`,
      curated: Boolean(circuit)
    };
  });
}

export function suggestFor(startId: string, days: number, opts: { interests?: DestinationCategory[]; traveller_type?: TravellerType; month?: number } = {}, limit = 6): RouteCardData[] {
  return routeCards(new CircuitEngine(getDb()).suggestRoutes(startId, { days, ...opts }, { limit }));
}
