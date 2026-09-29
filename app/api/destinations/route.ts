import { NextRequest } from "next/server";
import { DESTINATION_LEVELS } from "@/lib/master/enums";
import { getDb, stateById } from "@/lib/master/repo";
import { enumParam, intParam, json } from "@/lib/api/http";

/** GET /api/destinations?state=uttar-pradesh&level=A&category=SPIRITUAL&limit=20 */
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams;
  const db = getDb();
  const level = q.get("level") ? enumParam(q.get("level"), DESTINATION_LEVELS, "A") : null;
  const state = q.get("state");
  const category = q.get("category")?.toUpperCase();
  const limit = intParam(q.get("limit"), 1, 200, 200);

  let list = db.destinations;
  if (level) list = list.filter((d) => d.destination_level === level);
  if (state) list = list.filter((d) => stateById(d.state_id)?.slug === state);
  if (category) list = list.filter((d) => db.destination_categories.some((c) => c.destination_id === d.id && c.category === category));

  const results = [...list]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map((d) => ({
      id: d.id, slug: d.slug, name: d.name, state: stateById(d.state_id)?.name, state_slug: stateById(d.state_id)?.slug,
      level: d.destination_level, entity_type: d.entity_type, one_line_description: d.one_line_description,
      recommended_days: d.recommended_days, best_time: d.best_time_text, status: d.status, is_sample_data: d.is_sample_data
    }));
  return json({ count: results.length, results });
}
