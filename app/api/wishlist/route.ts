import { NextRequest } from "next/server";
import { attractionsOf, circuitBySlug, destinationBySlug } from "@/lib/master/repo";
import { badRequest, enumParam, json, notFound, rateLimit } from "@/lib/api/http";

const TARGETS = ["DESTINATION", "ATTRACTION", "CIRCUIT"] as const;

/** POST /api/wishlist — validates a wishlist item. Storing needs DATABASE_URL and a signed-in user. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "wishlist", 30);
  if (limited) return limited;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const type = enumParam(body.targetType, TARGETS, "DESTINATION");
  const slug = typeof body.slug === "string" ? body.slug : typeof body.destinationSlug === "string" ? body.destinationSlug : "";
  const found =
    type === "CIRCUIT" ? circuitBySlug(slug) :
    type === "ATTRACTION" ? (destinationBySlug(String(body.destinationSlug ?? "")) && attractionsOf(destinationBySlug(String(body.destinationSlug))!.id).some((a) => a.slug === slug)) :
    destinationBySlug(slug);
  if (!found) return notFound(`Unknown ${type.toLowerCase()} "${slug}"`);
  return json(
    { accepted: true, persisted: false, message: process.env.DATABASE_URL ? "Attach an authenticated user id before enabling writes." : "Configure DATABASE_URL and sign-in to save wishlist items — see README.md." },
    { status: 202 }
  );
}
