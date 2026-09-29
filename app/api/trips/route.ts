import { NextRequest } from "next/server";
import { destinationBySlug } from "@/lib/master/repo";
import { badRequest, intParam, json, notFound, rateLimit } from "@/lib/api/http";

/** POST /api/trips — validates a trip to save. Storing needs DATABASE_URL and a signed-in user. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "trips", 20);
  if (limited) return limited;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const slug = typeof body.destinationSlug === "string" ? body.destinationSlug : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return badRequest("title is required");
  if (!destinationBySlug(slug)) return notFound("Unknown destination");
  return json(
    {
      accepted: true,
      persisted: false,
      days: intParam(body.days, 1, 30, 1),
      message: process.env.DATABASE_URL ? "Attach an authenticated user id before enabling writes." : "Configure DATABASE_URL and sign-in to save trips — see README.md."
    },
    { status: 202 }
  );
}
