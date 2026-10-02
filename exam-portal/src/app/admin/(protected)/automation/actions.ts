"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { runPipeline } from "@/lib/pipeline/runner";
import { setPipelinePaused } from "@/lib/pipeline/settings";
import { retryFailedItem, resolveFailedItem } from "@/lib/pipeline/review";
import { recordAuditLog } from "@/lib/services/auditLog";

const OPS_ROLES = ["SUPER_ADMIN", "EDITOR"] as const;

function back(formData: FormData, fallback: string, params: Record<string, string>) {
  const to = String(formData.get("returnTo") || fallback);
  const url = new URL(to, "http://local");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("t", String(Date.now()));
  revalidatePath("/admin/automation", "layout");
  redirect(url.pathname + url.search);
}

export async function runPipelineNowAction(formData: FormData) {
  const admin = await requireAdminApi([...OPS_ROLES]);
  const force = formData.get("force") === "true";
  const summary = await runPipeline({ trigger: "MANUAL", force });
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "PipelineRun", contentId: summary.runId ?? undefined, newValue: { trigger: "MANUAL", force, status: summary.status, skipped: summary.skipped } });
  back(formData, "/admin/automation/pipeline", { ran: summary.skipped ?? summary.status, run: summary.runId ?? "" });
}

export async function setPausedAction(formData: FormData) {
  const admin = await requireAdminApi([...OPS_ROLES]);
  const paused = formData.get("paused") === "true";
  await setPipelinePaused(paused, admin.id);
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "AppSetting", contentId: "pipeline.paused", newValue: { paused } });
  back(formData, "/admin/automation", { paused: String(paused) });
}

export async function retryFailedItemAction(formData: FormData) {
  const admin = await requireAdminApi([...OPS_ROLES]);
  const id = String(formData.get("id") ?? "");
  const res = await retryFailedItem(id, admin.id);
  back(formData, "/admin/automation/failed", { retried: res.ok ? "ok" : "failed", msg: (res.message ?? "").slice(0, 160) });
}

export async function resolveFailedItemAction(formData: FormData) {
  const admin = await requireAdminApi([...OPS_ROLES]);
  await resolveFailedItem(String(formData.get("id") ?? ""), admin.id);
  back(formData, "/admin/automation/failed", { resolved: "1" });
}
