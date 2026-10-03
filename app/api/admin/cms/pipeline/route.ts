import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, notFound } from "@/lib/api/http";
import { clearQueue, continueInBackground, enqueue, finalize, overview, prepareAhead, publishFromPipeline, researchImages, runUntilCheckpoint, sendBackToResearch, skipDestination, stepDestination } from "@/lib/cms/pipeline/runner";
import { getDestination } from "@/lib/cms/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  return json(overview());
}

const ACTIONS = ["run", "step", "retry", "skip", "reset", "finalize", "publish", "clear", "enqueue", "search_images", "prepare", "continue"] as const;

/**
 * POST /api/admin/cms/pipeline — { action, id? , ids? }
 *   run      — run the current destination through every automatic stage until a checkpoint
 *   step     — run one stage of destination `id` (or the current one)
 *   retry    — resume a FAILED destination at the stage that failed
 *   skip     — mark `id` SKIPPED and move the cursor on
 *   reset    — send `id` back to the start of the pipeline
 *   finalize — finalise `id` with its currently approved images (the review screen uses /destinations/{id}/images)
 *   publish  — legacy READY_TO_PUBLISH records → PUBLISHED + COMPLETED
 *   search_images — re-run the image search for `id` (`target`: attraction id, "__destination" or "all")
 *   prepare  — research + image-search the next N destinations now (N = settings.prepare_ahead)
 *   continue — run the current destination and prepare the next ones in the background
 *   enqueue  — add existing destinations `ids` to the queue
 *   clear    — empty the queue
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  let body: { action?: unknown; id?: unknown; ids?: unknown; target?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const action = body.action;
  if (typeof action !== "string" || !(ACTIONS as readonly string[]).includes(action)) return badRequest(`action must be one of ${ACTIONS.join(", ")}`);
  const id = typeof body.id === "string" ? body.id : null;
  const need = () => {
    if (!id) throw new Error("id is required");
    const d = getDestination(id);
    if (!d) throw new Error("Destination not found");
    return d;
  };
  try {
    switch (action) {
      case "run": {
        const d = await runUntilCheckpoint();
        continueInBackground();
        return json({ destination: d, ...overview() });
      }
      case "step": {
        const target = id ?? overview().current?.id ?? null;
        if (!target) return json({ destination: null, ...overview() });
        return json({ destination: await stepDestination(target), ...overview() });
      }
      case "retry": {
        const d = need();
        if (d.pipeline.stage !== "FAILED") return badRequest("Only FAILED destinations can be retried");
        const next = await stepDestination(d.id);
        return json({ destination: next, ...overview() });
      }
      case "skip": return json({ destination: skipDestination(need().id), ...overview() });
      case "reset": return json({ destination: sendBackToResearch(need().id), ...overview() });
      case "finalize": {
        const d = need();
        const next = await finalize(d);
        continueInBackground();
        return json({ destination: next, ...overview() });
      }
      case "search_images": {
        const d = need();
        const target = typeof body.target === "string" ? body.target : "all";
        return json({ destination: await researchImages(d.id, target), ...overview() });
      }
      case "prepare": {
        const prepared = await prepareAhead();
        return json({ prepared, ...overview() });
      }
      case "continue": {
        continueInBackground();
        return json(overview());
      }
      case "publish": {
        const d = need();
        if (d.pipeline.stage !== "READY_TO_PUBLISH") return badRequest("Only destinations at the READY_TO_PUBLISH checkpoint can be published from the pipeline");
        return json({ destination: publishFromPipeline(d.id), ...overview() });
      }
      case "enqueue": {
        const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : id ? [id] : [];
        if (!ids.length) return badRequest("ids is required");
        enqueue(null, ids);
        return json(overview());
      }
      case "clear": {
        clearQueue();
        return json(overview());
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return message === "Destination not found" ? notFound(message) : badRequest(message);
  }
  return badRequest("Unknown action");
}
