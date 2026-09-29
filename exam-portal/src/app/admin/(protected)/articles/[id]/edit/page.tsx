import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getArticleForAdmin } from "@/lib/services/articles";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { ArticleForm } from "../../ArticleForm";
import { updateArticleAction, transitionArticleAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Article" };

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const article = await getArticleForAdmin(id);
  if (!article) notFound();

  const editable = canEditContent(article, admin);
  let transitions = availableTransitions(article.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Article</h1>
        <StatusBadge status={article.status} />
      </div>

      {saved ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <StatusActions id={article.id} transitions={transitions} action={transitionArticleAction} />

      {editable ? (
        <ArticleForm
          action={updateArticleAction.bind(null, id)}
          initial={article}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This article is {article.status.toLowerCase().replace("_", " ")} and you
          don&apos;t have permission to edit it further.
        </p>
      )}
    </div>
  );
}
