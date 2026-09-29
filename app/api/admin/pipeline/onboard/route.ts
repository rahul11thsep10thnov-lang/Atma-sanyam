import { NextRequest } from "next/server";
import { DESTINATION_CATEGORIES } from "@/lib/master/enums";
import { getDb } from "@/lib/master/repo";
import { onboardDestination, type NewDestinationInput } from "@/lib/master/pipeline/onboard";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, enumList, json, rateLimit } from "@/lib/api/http";

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);

/**
 * POST /api/admin/pipeline/onboard — runs the auto page-creation pipeline for a new destination
 * (validate → slug → record → nearby → attractions → circuits → content → SEO → page → links → index request).
 *
 * Always a dry run against a copy of the database: the response shows every step and the page that
 * WOULD be created. Persisting needs a database connection (README → "Going to production").
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  const limited = rateLimit(request, "admin-onboard", 20);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const latitude = num(body.latitude);
  const longitude = num(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return badRequest("latitude and longitude must be numbers");

  const attractions = Array.isArray(body.attractions)
    ? (body.attractions as Array<Record<string, unknown>>).slice(0, 30).map((a) => ({
        name: str(a.name, 120),
        description: str(a.description),
        latitude: Number.isFinite(num(a.latitude)) ? num(a.latitude) : undefined,
        longitude: Number.isFinite(num(a.longitude)) ? num(a.longitude) : undefined,
        opening_hours_text: str(a.opening_hours_text, 200) || undefined,
        categories: enumList(a.categories, DESTINATION_CATEGORIES)
      }))
    : undefined;

  const input: NewDestinationInput = {
    name: str(body.name, 120),
    state: str(body.state, 80),
    latitude,
    longitude,
    short_description: str(body.short_description),
    one_line_description: str(body.one_line_description, 200),
    categories: enumList(body.categories, DESTINATION_CATEGORIES),
    source_id: str(body.source_id, 80) || "SRC-BT-EDITORIAL-AI",
    level: body.level === "B" ? "B" : "A",
    parent_slug: str(body.parent_slug, 80) || undefined,
    best_time_text: str(body.best_time_text, 200) || undefined,
    attractions
  };

  const result = onboardDestination(getDb(), input, { dryRun: true });
  return json(
    {
      ok: result.ok,
      persisted: false,
      note: "Dry run — nothing was stored. The database is the source of truth and is changed through its own write path.",
      steps: result.steps,
      destination: result.destination && { id: result.destination.id, slug: result.destination.slug, name: result.destination.name },
      attractions: result.attractions.map((a) => ({ id: a.id, name: a.name })),
      connections: result.connections.length,
      circuits: result.circuits.length,
      page_url: result.page_url,
      content: result.content && {
        sections: result.content.page.sections.length,
        fact_check: result.content.fact_check.status,
        seo_issues: result.content.seo_issues,
        published_status: result.content.record.published_status
      },
      index_request: result.index_request
    },
    { status: result.ok ? 200 : 422 }
  );
}
