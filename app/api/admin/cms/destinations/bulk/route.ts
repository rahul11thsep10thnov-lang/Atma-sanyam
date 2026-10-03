import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json } from "@/lib/api/http";
import { bulkApply, type BulkAction, type BulkPayload } from "@/lib/cms/admin";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";

export const dynamic = "force-dynamic";

const ACTIONS: BulkAction[] = ["publish", "unpublish", "archive", "delete", "set_state", "add_category", "remove_category", "set_companions", "seo_template"];

/** POST /api/admin/cms/destinations/bulk — { ids: string[], action, payload? } */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  let body: { ids?: unknown; action?: unknown; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 500) return badRequest("ids must be an array of 1–500 destination ids");
  if (typeof body.action !== "string" || !(ACTIONS as string[]).includes(body.action)) return badRequest(`action must be one of ${ACTIONS.join(", ")}`);
  const ids = body.ids.filter((x): x is string => typeof x === "string");
  const payload = (body.payload && typeof body.payload === "object" ? body.payload : {}) as BulkPayload;
  return json(bulkApply(ids, body.action as BulkAction, payload));
}
