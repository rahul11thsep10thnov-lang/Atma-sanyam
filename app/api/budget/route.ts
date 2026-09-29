import { NextRequest } from "next/server";
import { BUDGET_TIERS } from "@/lib/master/enums";
import { estimateBudget } from "@/lib/master/engine/budget";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { badRequest, enumParam, intParam, json, notFound, rateLimit } from "@/lib/api/http";

/** GET /api/budget?destination=varanasi&days=3&travellers=2&hotel=BUDGET&food=MID_RANGE&transport=BUDGET&activities=2 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "budget", 60);
  if (limited) return limited;

  const q = new URL(request.url).searchParams;
  const slug = q.get("destination");
  if (!slug) return badRequest("destination is required");
  const dest = destinationBySlug(slug);
  if (!dest) return notFound("Unknown destination");

  const tier = enumParam(q.get("tier"), BUDGET_TIERS, "MID_RANGE");
  const estimate = estimateBudget(getDb(), {
    destination_ids: [dest.id],
    days: intParam(q.get("days"), 1, 30, dest.recommended_days),
    travellers: intParam(q.get("travellers"), 1, 20, 2),
    tier,
    tiers: {
      hotel: enumParam(q.get("hotel"), BUDGET_TIERS, tier),
      food: enumParam(q.get("food"), BUDGET_TIERS, tier),
      local_transport: enumParam(q.get("transport"), BUDGET_TIERS, tier),
      transport: enumParam(q.get("transport"), BUDGET_TIERS, tier),
      activity: enumParam(q.get("activity"), BUDGET_TIERS, tier)
    },
    activities_per_person: intParam(q.get("activities"), 0, 30, intParam(q.get("days"), 1, 30, dest.recommended_days))
  });
  return json(estimate);
}
