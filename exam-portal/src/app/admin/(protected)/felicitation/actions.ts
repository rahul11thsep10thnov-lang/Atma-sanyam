"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/session";
import { approveEntry, rejectEntry, pauseEntry, resumeEntry, extendEntry, setDisplayOrder, editEntry, deleteEntry } from "@/lib/felicitation/service";
import { saveFelicitationSettings, felicitationSettingsSchema, getFelicitationSettings } from "@/lib/felicitation/settings";
import { InvalidFelicitationTransition } from "@/lib/felicitation/state";
import { recordAuditLog } from "@/lib/services/auditLog";

const REVIEW = ["SUPER_ADMIN", "EDITOR", "REVIEWER"] as const;
const MANAGE = ["SUPER_ADMIN", "EDITOR"] as const;

function back(formData: FormData, params: Record<string, string>): never {
  const to = String(formData.get("returnTo") || "/admin/felicitation");
  const url = new URL(to.startsWith("/admin/") ? to : "/admin/felicitation", "http://local");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("t", String(Date.now()));
  revalidatePath("/admin/felicitation", "layout");
  revalidatePath("/", "layout");
  redirect(url.pathname + url.search);
}

async function guarded(formData: FormData, roles: readonly ("SUPER_ADMIN" | "EDITOR" | "REVIEWER")[], label: string, fn: (adminId: string, id: string) => Promise<unknown>) {
  const admin = await requireAdminApi([...roles]);
  const id = String(formData.get("id") ?? "");
  try {
    await fn(admin.id, id);
  } catch (e) {
    back(formData, { error: e instanceof InvalidFelicitationTransition || e instanceof Error ? e.message : `Could not ${label}.` });
  }
  back(formData, { done: label });
}

export async function approveAction(formData: FormData) {
  const start = String(formData.get("startAt") ?? "").trim();
  const startAt = start ? new Date(start) : null;
  return guarded(formData, REVIEW, "approved", (a, id) => approveEntry(id, a, startAt && !isNaN(+startAt) ? startAt : null));
}
export async function rejectAction(formData: FormData) {
  return guarded(formData, REVIEW, "rejected", (a, id) => rejectEntry(id, a, String(formData.get("reason") ?? "").slice(0, 300) || null));
}
export async function pauseAction(formData: FormData) {
  return guarded(formData, MANAGE, "paused", (a, id) => pauseEntry(id, a));
}
export async function resumeAction(formData: FormData) {
  return guarded(formData, MANAGE, "resumed", (a, id) => resumeEntry(id, a));
}
export async function extendAction(formData: FormData) {
  return guarded(formData, MANAGE, "extended", (a, id) => extendEntry(id, a, Number(formData.get("hours") ?? 24)));
}
export async function orderAction(formData: FormData) {
  return guarded(formData, MANAGE, "reordered", (a, id) => setDisplayOrder(id, a, Number(formData.get("displayOrder") ?? 0)));
}
export async function deleteAction(formData: FormData) {
  const admin = await requireAdminApi(["SUPER_ADMIN"]);
  await deleteEntry(String(formData.get("id") ?? ""), admin.id);
  revalidatePath("/admin/felicitation", "layout");
  redirect(`/admin/felicitation?done=deleted&t=${Date.now()}`);
}

const editSchema = z.object({
  candidateName: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  examName: z.string().trim().min(2).max(120),
});
export async function editAction(formData: FormData) {
  const p = editSchema.safeParse({ candidateName: formData.get("candidateName"), locality: formData.get("locality"), city: formData.get("city"), state: formData.get("state"), examName: formData.get("examName") });
  if (!p.success) back(formData, { error: p.error.issues[0].message });
  return guarded(formData, MANAGE, "saved", (a, id) => editEntry(id, a, p.data));
}

export async function saveSettingsAction(formData: FormData) {
  const admin = await requireAdminApi([...MANAGE]);
  const cur = await getFelicitationSettings();
  const num = (k: string) => Number(formData.get(k));
  const parsed = felicitationSettingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    pausedAll: formData.get("pausedAll") === "on",
    maxEntriesPerCycle: num("maxEntriesPerCycle"),
    broadcastSeconds: num("broadcastSeconds"),
    listingHours: num("listingHours"),
    animationsEnabled: formData.get("animationsEnabled") === "on",
    celebrationIntensity: String(formData.get("celebrationIntensity")),
    autoRotate: formData.get("autoRotate") === "on",
    featuredEntryId: String(formData.get("featuredEntryId") ?? "") || null,
    priceRupees: num("priceRupees"),
    referencePriceRupees: num("referencePriceRupees"),
  });
  if (!parsed.success) redirect(`/admin/felicitation/settings?error=${encodeURIComponent(`${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`)}`);
  const saved = await saveFelicitationSettings(parsed.data, admin.id);
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "FelicitationSettings", contentId: "felicitation.settings", previousValue: cur, newValue: saved });
  revalidatePath("/", "layout");
  redirect(`/admin/felicitation/settings?saved=${Date.now()}`);
}

export async function quickPauseAllAction(formData: FormData) {
  const admin = await requireAdminApi([...MANAGE]);
  const cur = await getFelicitationSettings();
  const next = { ...cur, pausedAll: formData.get("pausedAll") === "true" };
  await saveFelicitationSettings(next, admin.id);
  await recordAuditLog({ adminUserId: admin.id, action: "UPDATE", contentType: "FelicitationSettings", contentId: "felicitation.settings", newValue: { pausedAll: next.pausedAll } });
  back(formData, { done: next.pausedAll ? "all broadcasts paused" : "broadcasts resumed" });
}
