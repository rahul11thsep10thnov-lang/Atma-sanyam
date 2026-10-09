"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { sourceInputSchema } from "@/lib/validation/source";
import {
  createSource,
  updateSource,
  setSourceActive,
  setSourceApproval,
  bulkSourceUpdate,
  deleteSource,
  SourcePolicyError,
} from "@/lib/services/sources";
import { recordAuditLog } from "@/lib/services/auditLog";

export interface FormState {
  error?: string;
}

const SOURCE_ADMIN_ROLES = ["SUPER_ADMIN", "EDITOR"] as const;
const LIST = "/admin/automation/sources";
/** Bulk test/run are synchronous server actions; keep them bounded. */
const MAX_BULK_NETWORK = 25;

function readInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    organizationId: String(formData.get("organizationId") ?? ""),
    listingUrl: String(formData.get("listingUrl") ?? "").trim(),
    officialDomain: String(formData.get("officialDomain") ?? ""),
    sourceType: String(formData.get("sourceType") ?? "HTML"),
    category: String(formData.get("category") ?? "CENTRAL"),
    stateCode: String(formData.get("stateCode") ?? ""),
    groupName: String(formData.get("groupName") ?? ""),
    rssUrl: String(formData.get("rssUrl") ?? ""),
    apiUrl: String(formData.get("apiUrl") ?? ""),
    parserType: String(formData.get("parserType") ?? ""),
    parserConfig: String(formData.get("parserConfig") ?? ""),
    paginationConfig: String(formData.get("paginationConfig") ?? ""),
    priority: String(formData.get("priority") ?? "NORMAL"),
    checkFrequencyMinutes: String(formData.get("checkFrequencyMinutes") ?? "240"),
    requestTimeoutMs: String(formData.get("requestTimeoutMs") ?? "20000"),
    minRequestIntervalMs: String(formData.get("minRequestIntervalMs") ?? "1500"),
    isAggregator: formData.get("isAggregator"),
    active: formData.get("active"),
  };
}

function policyMessage(err: unknown): string | null {
  if (err instanceof SourcePolicyError) return err.message;
  // P2002 = unique constraint (listingUrl / canonicalUrl), by code not text.
  if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
    return "A source with that URL already exists.";
  }
  return null;
}

/** Only same-app paths are accepted as a return target. */
function safeReturn(formData: FormData, fallback: string) {
  const r = String(formData.get("returnTo") ?? "");
  return r.startsWith("/admin/automation/sources") ? r : fallback;
}

function withParam(path: string, key: string, value: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

export async function createSourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const parsed = sourceInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  let sourceId: string;
  try {
    sourceId = (await createSource(parsed.data, admin.id)).id;
  } catch (err) {
    const msg = policyMessage(err);
    if (msg) return { error: msg };
    throw err;
  }
  revalidatePath(LIST);
  redirect(`${LIST}/${sourceId}/edit?saved=${Date.now()}`);
}

export async function updateSourceAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const parsed = sourceInputSchema.safeParse(readInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await updateSource(id, parsed.data, admin.id);
  } catch (err) {
    const msg = policyMessage(err);
    if (msg) return { error: msg };
    throw err;
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}/edit`);
  redirect(`${LIST}/${id}/edit?saved=${Date.now()}`);
}

export async function toggleSourceActiveAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const back = safeReturn(formData, LIST);
  try {
    await setSourceActive(id, active, admin.id);
  } catch (err) {
    const msg = policyMessage(err);
    if (msg) redirect(withParam(back, "error", msg));
    throw err;
  }
  revalidatePath(LIST);
  redirect(withParam(back, "updated", String(Date.now())));
}

export async function setApprovalAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) === "REJECTED" ? "REJECTED" : "APPROVED";
  await setSourceApproval(id, decision, admin.id);
  revalidatePath(LIST);
  redirect(withParam(safeReturn(formData, `${LIST}/${id}/edit`), "updated", String(Date.now())));
}

/** "Run now": a real check (stores documents), bypassing ETag/hash
 * short-circuits so the admin sees a full pass. */
export async function checkSourceNowAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  const { checkSource } = await import("@/lib/pipeline/sourceCheck");
  const result = await checkSource(id, { force: true });
  await recordAuditLog({
    adminUserId: admin.id,
    action: "UPDATE",
    contentType: "Source",
    contentId: id,
    newValue: { manualCheck: true, ok: result.ok, outcome: result.outcome, newItems: result.newItems, error: result.error },
  });
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}/edit`);
  if (result.outcome === "NOT_APPROVED" || result.outcome === "LOCKED") redirect(`${LIST}/${id}/edit?error=${encodeURIComponent(result.error ?? "")}`);
  redirect(`${LIST}/${id}/edit?checked=${Date.now()}`);
}

/** Verification: reachability + intended domain + robots + parse. For an
 * aggregator the admin may tick "terms reviewed" to complete it. */
export async function verifySourceAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  const termsReviewed = formData.get("termsReviewed") === "on";
  const { verifySource } = await import("@/lib/pipeline/verify");
  const r = await verifySource(id, { termsReviewedBy: termsReviewed ? admin.id : null });
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "Source", contentId: id, newValue: { verification: r.status, termsReviewed, note: r.note.slice(0, 300) } });
  revalidatePath(`${LIST}/${id}/edit`);
  redirect(`${LIST}/${id}/edit?verified=${Date.now()}`);
}

export async function discoverSourcesAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  const { discoverFromSource } = await import("@/lib/pipeline/discovery");
  const r = await discoverFromSource(id);
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "Source", contentId: id, newValue: { discovery: true, created: r.created.length, error: r.error } });
  revalidatePath(LIST);
  if (r.error) redirect(`${LIST}/${id}/edit?error=${encodeURIComponent(`Discovery: ${r.error}`)}`);
  redirect(`${LIST}/${id}/edit?discovered=${r.created.length}`);
}

/** Bulk operations on the selected rows. Enable/disable/approve/reject are
 * judged per source; test and run are capped and run a few at a time. */
export async function bulkSourcesAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const op = String(formData.get("op"));
  const back = safeReturn(formData, LIST);
  if (!ids.length) redirect(withParam(back, "error", "Select at least one source."));

  let message: string;
  if (op === "enable" || op === "disable" || op === "approve" || op === "reject") {
    const { done, refused } = await bulkSourceUpdate(ids, op, admin.id);
    message = `${op}: ${done.length} done${refused.length ? `, ${refused.length} refused (${refused.slice(0, 3).map((r) => `${r.name}: ${r.reason}`).join("; ")})` : ""}`;
  } else if (op === "test") {
    const { verifySource } = await import("@/lib/pipeline/verify");
    const { mapLimit } = await import("@/lib/pipeline/runner");
    const subset = ids.slice(0, MAX_BULK_NETWORK);
    const results = await mapLimit(subset, 3, (id) => verifySource(id).catch((e) => ({ status: "FAILED" as const, note: String(e) })));
    const ok = results.filter((r) => r.status === "VERIFIED").length;
    message = `test: ${ok} verified, ${results.length - ok} not verified${ids.length > subset.length ? ` (first ${MAX_BULK_NETWORK} only)` : ""}`;
  } else if (op === "run") {
    const { runPipeline } = await import("@/lib/pipeline/runner");
    const subset = ids.slice(0, MAX_BULK_NETWORK);
    const s = await runPipeline({ trigger: "MANUAL", sourceIds: subset, force: true });
    message = s.skipped ? `run skipped: another run is ${s.skipped}` : `run: ${s.sourcesChecked} checked, ${s.newNotices} new notices, ${s.failures} failures`;
  } else {
    message = "Unknown bulk action.";
  }
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "Source", contentId: "bulk", newValue: { op, count: ids.length, message: message.slice(0, 500) } });
  revalidatePath(LIST);
  redirect(withParam(back, "notice", message.slice(0, 400)));
}

/** Per-row buttons inside the bulk form: "approve:<id>", "enable:<id>", "disable:<id>". */
export async function rowSourceAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const [op, id] = String(formData.get("row") ?? "").split(":");
  const back = safeReturn(formData, LIST);
  if (!id || !["approve", "enable", "disable"].includes(op)) redirect(withParam(back, "error", "Unknown action."));
  const { refused } = await bulkSourceUpdate([id], op as "approve" | "enable" | "disable", admin.id);
  revalidatePath(LIST);
  if (refused.length) redirect(withParam(back, "error", `${refused[0].name}: ${refused[0].reason}`));
  const done: Record<string, string> = { approve: "Approved.", enable: "Enabled.", disable: "Disabled." };
  redirect(withParam(back, "notice", done[op]));
}

export async function deleteSourceAction(formData: FormData) {
  const admin = await requireAdminApi([...SOURCE_ADMIN_ROLES]);
  const id = String(formData.get("id"));
  await deleteSource(id, admin.id);
  revalidatePath(LIST);
  redirect(`${LIST}?deleted=${Date.now()}`);
}
