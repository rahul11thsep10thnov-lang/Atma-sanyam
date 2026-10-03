import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, notFound } from "@/lib/api/http";
import { duplicateDestination } from "@/lib/cms/admin";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";
import { publishFromPipeline } from "@/lib/cms/pipeline/runner";
import { getDestination, setStatus } from "@/lib/cms/store";

export const dynamic = "force-dynamic";

const ACTIONS = ["publish", "unpublish", "archive", "review", "duplicate"] as const;

/** POST /api/admin/cms/destinations/{id}/action — { action: publish | unpublish | archive | review | duplicate }. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  const d = getDestination(params.id);
  if (!d) return notFound("Destination not found");
  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const action = body.action;
  if (typeof action !== "string" || !(ACTIONS as readonly string[]).includes(action)) return badRequest(`action must be one of ${ACTIONS.join(", ")}`);
  switch (action) {
    case "publish":
      // Publishing from the pipeline's final checkpoint also completes the pipeline entry and moves the cursor on.
      return json({ destination: d.pipeline.stage === "READY_TO_PUBLISH" ? publishFromPipeline(d.id) : setStatus(d.id, "PUBLISHED") });
    case "unpublish":
      return json({ destination: setStatus(d.id, "DRAFT") });
    case "archive":
      return json({ destination: setStatus(d.id, "ARCHIVED") });
    case "review":
      return json({ destination: setStatus(d.id, "IN_REVIEW") });
    case "duplicate":
      return json({ destination: duplicateDestination(d.id) }, { status: 201 });
  }
  return badRequest("Unknown action");
}
