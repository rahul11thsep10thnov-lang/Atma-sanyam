import { NextRequest } from "next/server";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { json } from "@/lib/api/http";

/** GET /api/accommodation-areas?destination=varanasi */
export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get("destination");
  const dest = slug ? destinationBySlug(slug) : null;
  const rows = getDb().accommodation_areas.filter((r) => !dest || r.destination_id === dest.id);
  return json({ count: rows.length, results: rows });
}
