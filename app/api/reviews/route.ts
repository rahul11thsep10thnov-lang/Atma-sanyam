import { NextRequest } from "next/server";
import { destinationBySlug } from "@/lib/master/repo";
import { assessSpam } from "@/lib/api/spam";
import { badRequest, enumParam, intParam, json, notFound, rateLimit } from "@/lib/api/http";

const TARGETS = ["DESTINATION", "ATTRACTION", "EXPERIENCE", "ACCOMMODATION_AREA"] as const;
const SUBRATINGS = ["cleanliness", "value", "accessibility", "service", "food", "crowding"] as const;

/**
 * POST /api/reviews — validates a review, scores it for spam and reports the moderation status it
 * would receive. Persistence needs DATABASE_URL and a signed-in user (see README); until then the
 * response says plainly that nothing was stored.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "reviews", 5);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const slug = typeof body.destinationSlug === "string" ? body.destinationSlug : "";
  if (!destinationBySlug(slug)) return notFound("Unknown destination");
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length < 10 || text.length > 5000) return badRequest("Review text must be 10–5000 characters");

  const overall = intParam(body.overallRating, 0, 5, 0);
  if (overall < 1) return badRequest("overallRating must be between 1 and 5");

  const ratings: Record<string, number> = {};
  for (const k of SUBRATINGS) if (body[k] !== undefined) ratings[k] = intParam(body[k], 1, 5, 3);

  const spam = assessSpam(`${typeof body.title === "string" ? body.title : ""} ${text}`);
  return json(
    {
      accepted: true,
      persisted: false,
      target_type: enumParam(body.targetType, TARGETS, "DESTINATION"),
      overall_rating: overall,
      ratings,
      moderation: {
        status: spam.flagged ? "FLAGGED" : "PENDING",
        spam_score: spam.score,
        reasons: spam.reasons,
        verified_visit: false
      },
      message: process.env.DATABASE_URL
        ? "Attach an authenticated user id before enabling writes."
        : "Review is valid. Configure DATABASE_URL and sign-in to store reviews — see README.md."
    },
    { status: 202 }
  );
}
