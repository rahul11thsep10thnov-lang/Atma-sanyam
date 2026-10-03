import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, notFound } from "@/lib/api/http";
import { MAX_APPROVED_PER_ATTRACTION } from "@/lib/cms/admin";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";
import { continueInBackground, currentDestination, finalizeDestination } from "@/lib/cms/pipeline/runner";
import { getDestination } from "@/lib/cms/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/cms/destinations/{id}/images — FINALIZE the destination.
 * { selection: { [attractionId | "__destination" | "__hero"]: imageId[] }, allow_empty?: boolean }
 * Validates the selection (1–4 per attraction, licence recorded), stores the approved files as each
 * provider's terms require, marks the page ready/published and moves the pipeline to the next destination.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  if (!getDestination(params.id)) return notFound("Destination not found");
  let body: { selection?: unknown; allow_empty?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.selection || typeof body.selection !== "object") return badRequest("selection is required");
  const selection: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(body.selection as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const ids = v.filter((x): x is string => typeof x === "string").slice(0, 20);
    if (k !== "__hero" && k !== "__destination" && ids.length > MAX_APPROVED_PER_ATTRACTION) return badRequest(`At most ${MAX_APPROVED_PER_ATTRACTION} images may be approved per attraction`);
    selection[k] = ids;
  }
  const r = await finalizeDestination(params.id, selection, { allowEmpty: body.allow_empty === true });
  if (r.finalized) continueInBackground();
  const next = currentDestination();
  return json({ ...r, next: next ? { id: next.id, name: next.name, stage: next.pipeline.stage } : null }, { status: r.finalized ? 200 : 422 });
}
