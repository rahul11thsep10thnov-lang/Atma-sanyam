import { NextRequest } from "next/server";
import { DESTINATION_CATEGORIES, BUDGET_TIERS, TRAVELLER_TYPES } from "@/lib/master/enums";
import { planItinerary } from "@/lib/master/engine/itinerary";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { attractionHrefs } from "@/lib/master/view";
import { badRequest, enumList, enumParam, intParam, json, notFound, rateLimit } from "@/lib/api/http";

/**
 * POST /api/itinerary — builds a day-by-day plan from stored attractions, hours and the destination graph.
 * Body: { stops: [{ slug, days }] | destination: slug + days, travellers, tier, traveller_type, interests[], month? }
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "itinerary", 20);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const rawStops = Array.isArray(body.stops) ? body.stops : typeof body.destination === "string" ? [{ slug: body.destination, days: body.days }] : [];
  if (rawStops.length === 0 || rawStops.length > 5) return badRequest("Provide 1–5 stops (or a destination slug)");

  const stops = [];
  for (const s of rawStops as Array<{ slug?: unknown; days?: unknown }>) {
    const dest = typeof s.slug === "string" ? destinationBySlug(s.slug) : undefined;
    if (!dest) return notFound(`Unknown destination "${String(s.slug)}"`);
    stops.push({ destination_id: dest.id, days: intParam(s.days, 1, 10, dest.recommended_days) });
  }
  if (stops.reduce((t, s) => t + s.days, 0) > 21) return badRequest("Trips longer than 21 days are not supported");

  const plan = planItinerary(getDb(), {
    stops,
    travellers: intParam(body.travellers, 1, 20, 2),
    tier: enumParam(body.tier, BUDGET_TIERS, "MID_RANGE"),
    traveller_type: enumParam(body.traveller_type, TRAVELLER_TYPES, "ANY"),
    interests: enumList(body.interests, DESTINATION_CATEGORIES),
    month: typeof body.month === "number" || typeof body.month === "string" ? intParam(body.month, 1, 12, 0) || undefined : undefined
  });

  return json({
    plan,
    hrefs: attractionHrefs(plan.activities.map((a) => a.attraction_id).filter((x): x is string => Boolean(x))),
    disclaimer:
      "Generated from stored attractions, reported opening hours and estimated travel times. Time-sensitive details are unverified until marked otherwise — confirm before you travel."
  });
}
