import { NextRequest } from "next/server";
import { getDb } from "@/lib/master/repo";
import { badRequest, json, rateLimit } from "@/lib/api/http";

/** GET /api/facts?entity=IN-UP-VNS — every stored claim about an entity, with its source and confidence. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "facts", 60);
  if (limited) return limited;
  const entity = new URL(request.url).searchParams.get("entity");
  if (!entity) return badRequest("entity (permanent id) is required");
  const db = getDb();
  const facts = db.facts.filter((f) => f.entity_id === entity);
  return json({ entity, count: facts.length, results: facts.map((f) => ({ ...f, source: db.sources.find((s) => s.id === f.source_id)?.source_name })) });
}
