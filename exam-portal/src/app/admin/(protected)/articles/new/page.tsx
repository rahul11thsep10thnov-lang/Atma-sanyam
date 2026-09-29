import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { canCreateContent } from "@/lib/services/ownership";
import { ArticleForm } from "../ArticleForm";
import { createArticleAction } from "../actions";

export const metadata: Metadata = { title: "New Article" };

export default async function NewArticlePage() {
  const admin = await requireAdmin();
  if (!canCreateContent(admin.role)) redirect("/admin/forbidden");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Article</h1>
      <ArticleForm action={createArticleAction} submitLabel="Save Draft" />
    </div>
  );
}
