"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { setRecruitmentStatus } from "@/lib/services/catalogue";

export async function setRecruitmentStatusAction(formData: FormData) {
  const admin = await requireAdminApi(["SUPER_ADMIN", "EDITOR"]);
  const status = String(formData.get("status") ?? "");
  if (status !== "PUBLISHED" && status !== "ARCHIVED" && status !== "DRAFT") redirect("/admin/recruitments");
  await setRecruitmentStatus(String(formData.get("id") ?? ""), status, admin.id);
  revalidatePath("/admin/recruitments");
  revalidatePath("/", "layout");
  redirect(`${String(formData.get("returnTo") || "/admin/recruitments")}${String(formData.get("returnTo") || "").includes("?") ? "&" : "?"}saved=${Date.now()}`);
}
