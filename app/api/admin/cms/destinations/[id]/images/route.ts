import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, notFound } from "@/lib/api/http";
import { applyImageApproval, MAX_APPROVED_PER_ATTRACTION } from "@/lib/cms/admin";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";
import { approveAndContinue } from "@/lib/cms/pipeline/runner";
import { getDestination } from "@/lib/cms/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/cms/destinations/{id}/images
 * { selection: { [attractionId | "__destination" | "__hero"]: imageId[] }, reject_others?: boolean, continue_pipeline?: boolean }
 * One call approves the chosen images of every attraction of the destination (max 4 each);
 * when the destination is waiting at the pipeline's image checkpoint it moves on to FINALIZING.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  if (!getDestination(params.id)) return notFound("Destination not found");
  let body: { selection?: unknown; reject_others?: unknown; continue_pipeline?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.selection || typeof body.selection !== "object") return badRequest("selection is required");
  const selection: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(body.selection as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const ids = v.filter((x): x is string => typeof x === "string");
    if (k !== "__hero" && ids.length > MAX_APPROVED_PER_ATTRACTION) return badRequest(`At most ${MAX_APPROVED_PER_ATTRACTION} images may be approved per attraction (${k} has ${ids.length})`);
    selection[k] = ids;
  }
  let d = applyImageApproval(params.id, selection, body.reject_others !== false);
  if (d && body.continue_pipeline !== false && d.pipeline.stage === "AWAITING_APPROVAL") d = approveAndContinue(d.id);
  return json({ destination: d });
}
