import { NextResponse } from "next/server";
import { requireAdminApi, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { runPipeline, listPipelineRuns } from "@/lib/pipeline/runner";
import { recordAuditLog } from "@/lib/services/auditLog";

/**
 * The scheduler entry point (spec §19). Two callers:
 *  - a cron (Vercel cron, GitHub Action, curl from crontab) with
 *    `Authorization: Bearer $CRON_SECRET` → trigger CRON;
 *  - a signed-in SUPER_ADMIN/EDITOR → trigger MANUAL.
 * GET runs the pipeline for cron callers (Vercel cron can only GET) and
 * returns recent runs for admins; POST runs it for either caller.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
  const alt = request.headers.get("x-cron-secret");
  return bearer === secret || alt === secret;
}

async function adminOrNull() {
  try {
    return await requireAdminApi(["SUPER_ADMIN", "EDITOR"]);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) return null;
    throw err;
  }
}

export async function GET(request: Request) {
  if (cronAuthorized(request)) {
    const summary = await runPipeline({ trigger: "CRON" });
    return NextResponse.json({ ok: summary.status !== "FAILED", ...summary });
  }
  const admin = await adminOrNull();
  if (!admin) return NextResponse.json({ error: "Sign in or provide the cron secret." }, { status: 401 });
  return NextResponse.json({ runs: await listPipelineRuns(20) });
}

export async function POST(request: Request) {
  let body: { sourceIds?: string[]; force?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const sourceIds = Array.isArray(body.sourceIds) ? body.sourceIds.filter((x) => typeof x === "string").slice(0, 100) : undefined;
  const force = body.force === true;

  if (cronAuthorized(request)) {
    const summary = await runPipeline({ trigger: "CRON", sourceIds, force });
    return NextResponse.json({ ok: summary.status !== "FAILED", ...summary });
  }
  const admin = await adminOrNull();
  if (!admin) return NextResponse.json({ error: "Sign in or provide the cron secret." }, { status: 401 });
  const summary = await runPipeline({ trigger: "MANUAL", sourceIds, force });
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "PipelineRun", contentId: summary.runId ?? undefined, newValue: { trigger: "MANUAL", sourceIds, force, status: summary.status, skipped: summary.skipped } });
  return NextResponse.json({ ok: summary.status !== "FAILED", ...summary });
}
