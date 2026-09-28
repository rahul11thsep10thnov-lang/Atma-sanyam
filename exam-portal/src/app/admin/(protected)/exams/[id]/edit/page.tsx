import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getExamForAdmin } from "@/lib/services/exams";
import { listOrganizations, listCategories, listStates } from "@/lib/services/lookups";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { ExamForm } from "../../ExamForm";
import { updateExamAction, transitionExamAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Exam" };

export default async function EditExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const exam = await getExamForAdmin(id);
  if (!exam) notFound();

  const [organizations, categories, states] = await Promise.all([
    listOrganizations(),
    listCategories(),
    listStates(),
  ]);

  const editable = canEditContent(exam, admin);
  let transitions = availableTransitions(exam.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Exam</h1>
        <StatusBadge status={exam.status} />
      </div>

      {saved ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <StatusActions id={exam.id} transitions={transitions} action={transitionExamAction} />

      {editable ? (
        <ExamForm
          action={updateExamAction.bind(null, id)}
          initial={exam}
          organizations={organizations}
          categories={categories}
          states={states}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This exam is {exam.status.toLowerCase().replace("_", " ")} and you
          don&apos;t have permission to edit it further.
        </p>
      )}
    </div>
  );
}
