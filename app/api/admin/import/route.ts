import { NextRequest } from "next/server";
import { getDb } from "@/lib/master/repo";
import { runImport, type RawClaim } from "@/lib/master/pipeline/import";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, rateLimit } from "@/lib/api/http";

const isPrimitive = (v: unknown): v is string | number | boolean | null => v === null || ["string", "number", "boolean"].includes(typeof v);

/**
 * POST /api/admin/import — { claims: [{ source_id, entity: { id | name, state }, fact_type, value, text? }] }
 * Runs SOURCE → EXTRACT → NORMALISE → MATCH → CONFLICT CHECK on a copy of the database and reports
 * what would be added, confirmed, skipped as duplicate, or held as a conflict for an admin.
 * Conflicts are never auto-resolved. Dry run only; nothing is stored.
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  const limited = rateLimit(request, "admin-import", 10);
  if (limited) return limited;

  let body: { claims?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!Array.isArray(body.claims) || body.claims.length === 0 || body.claims.length > 500) return badRequest("claims must be an array of 1–500 items");

  const claims: RawClaim[] = [];
  for (const c of body.claims as Array<Record<string, unknown>>) {
    const entity = (c.entity ?? {}) as Record<string, unknown>;
    if (typeof c.source_id !== "string" || typeof c.fact_type !== "string" || !isPrimitive(c.value) || (typeof entity.id !== "string" && typeof entity.name !== "string"))
      return badRequest("each claim needs source_id, fact_type, value and entity.id or entity.name");
    claims.push({
      source_id: c.source_id,
      fact_type: c.fact_type,
      value: c.value,
      text: typeof c.text === "string" ? c.text : undefined,
      unit: typeof c.unit === "string" ? c.unit : null,
      entity: { id: typeof entity.id === "string" ? entity.id : undefined, name: typeof entity.name === "string" ? entity.name : undefined, state: typeof entity.state === "string" ? entity.state : undefined }
    });
  }

  const report = runImport(structuredClone(getDb()), claims);
  return json({
    persisted: false,
    received: report.received,
    added: report.added.length,
    confirmed: report.confirmed,
    duplicates: report.duplicates,
    conflicts: report.conflicts,
    unresolved: report.unresolved,
    errors: report.errors.map((e) => ({ fact_type: e.claim.fact_type, reason: e.reason }))
  });
}
