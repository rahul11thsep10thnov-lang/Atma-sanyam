import { NextRequest } from "next/server";
import { DESTINATION_CATEGORIES } from "@/lib/master/enums";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { json } from "@/lib/api/http";
import { attractionPath } from "@/lib/master/view";

/** GET /api/attractions?destination=varanasi&category=SPIRITUAL */
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams;
  const db = getDb();
  const dest = q.get("destination") ? destinationBySlug(q.get("destination")!) : null;
  const category = q.get("category")?.toUpperCase();
  let list = db.attractions;
  if (dest) list = list.filter((a) => a.destination_id === dest.id || db.destinations.find((d) => d.id === a.destination_id)?.parent_destination_id === dest.id);
  if (category && (DESTINATION_CATEGORIES as readonly string[]).includes(category)) list = list.filter((a) => a.categories.includes(category as (typeof DESTINATION_CATEGORIES)[number]));
  return json({ count: list.length, results: list.map((a) => ({ ...a, path: attractionPath(a) })) });
}
