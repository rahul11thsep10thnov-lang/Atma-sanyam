import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAnswerKeyForAdmin } from "@/lib/services/answerKeys";
import { listExamsForSelect } from "@/lib/services/lookups";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { AnswerKeyForm } from "../../AnswerKeyForm";
import { updateAnswerKeyAction, transitionAnswerKeyAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Answer Key" };

export default async function EditAnswerKeyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const answerKey = await getAnswerKeyForAdmin(id);
  if (!answerKey) notFound();

  const exams = await listExamsForSelect();

  const editable = canEditContent(answerKey, admin);
  let transitions = availableTransitions(answerKey.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Answer Key</h1>
        <StatusBadge status={answerKey.status} />
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

      <StatusActions
        id={answerKey.id}
        transitions={transitions}
        action={transitionAnswerKeyAction}
      />

      {editable ? (
        <AnswerKeyForm
          action={updateAnswerKeyAction.bind(null, id)}
          initial={answerKey}
          exams={exams}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This answer key is {answerKey.status.toLowerCase().replace("_", " ")}{" "}
          and you don&apos;t have permission to edit it further.
        </p>
      )}
    </div>
  );
}
