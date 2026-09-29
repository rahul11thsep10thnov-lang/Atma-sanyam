import { NextRequest } from "next/server";
import { DESTINATION_CATEGORIES, TRAVELLER_TYPES } from "@/lib/master/enums";
import { CircuitEngine } from "@/lib/master/engine/circuits";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { badRequest, enumList, enumParam, intParam, json, notFound, rateLimit } from "@/lib/api/http";

/** GET /api/routes?from=prayagraj&days=3&interests=SPIRITUAL,FOOD&month=11 — multi-city routes that actually fit the trip. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "routes", 60);
  if (limited) return limited;

  const q = new URL(request.url).searchParams;
  const from = q.get("from");
  if (!from) return badRequest("from (destination slug) is required");
  const start = destinationBySlug(from);
  if (!start) return notFound("Unknown destination");

  const engine = new CircuitEngine(getDb());
  const routes = engine.suggestRoutes(
    start.id,
    {
      days: intParam(q.get("days"), 1, 21, 3),
      traveller_type: enumParam(q.get("traveller"), TRAVELLER_TYPES, "ANY"),
      interests: enumList(q.get("interests"), DESTINATION_CATEGORIES),
      month: intParam(q.get("month"), 1, 12, 0) || undefined
    },
    { limit: 6 }
  );
  const nameOf = (id: string) => getDb().destinations.find((d) => d.id === id)?.name ?? id;
  return json({
    from: start.name,
    count: routes.length,
    routes: routes.map((r) => ({
      stops: r.stops.map((s) => ({ ...s, name: nameOf(s.destination_id) })),
      total_km: Math.round(r.total_km),
      total_travel_hours: Number((r.total_minutes / 60).toFixed(1)),
      days_needed: r.days_needed,
      days_min: r.days_min,
      score: Number(r.score.toFixed(3)),
      reasons: r.reasons,
      legs: r.legs.map((l) => ({ from: nameOf(l.from), to: nameOf(l.to), km: l.distance_km, minutes: l.minutes, mode: l.mode, estimated: l.estimated, reasons: l.reasons })),
      circuit_id: r.circuit_id
    })),
    note: "Distances are approximate and road times are estimated from distance; connection data is unverified until marked otherwise."
  });
}
