"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/session";
import { createCategory, renameCategory } from "@/lib/services/catalogue";

const ROLES = ["SUPER_ADMIN", "EDITOR"] as const;

export async function createCategoryAction(formData: FormData) {
  const admin = await requireAdminApi([...ROLES]);
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) redirect(`/admin/categories?error=${encodeURIComponent("Name is required.")}`);
  await createCategory(name, admin.id, String(formData.get("parentId") ?? "") || null);
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?saved=${Date.now()}`);
}

export async function renameCategoryAction(formData: FormData) {
  const admin = await requireAdminApi([...ROLES]);
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) redirect(`/admin/categories?error=${encodeURIComponent("Name is required.")}`);
  await renameCategory(String(formData.get("id") ?? ""), name, admin.id);
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  redirect(`/admin/categories?saved=${Date.now()}`);
}
