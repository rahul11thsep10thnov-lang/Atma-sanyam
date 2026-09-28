import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getResultForAdmin } from "@/lib/services/results";
import {
  listExamsForSelect,
  listAdmitCardsForSelect,
  listAnswerKeysForSelect,
} from "@/lib/services/lookups";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { ResultForm } from "../../ResultForm";
import { updateResultAction, transitionResultAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Result" };

export default async function EditResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const result = await getResultForAdmin(id);
  if (!result) notFound();

  const [exams, admitCards, answerKeys] = await Promise.all([
    listExamsForSelect(),
    listAdmitCardsForSelect(),
    listAnswerKeysForSelect(),
  ]);

  const editable = canEditContent(result, admin);
  let transitions = availableTransitions(result.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Result</h1>
        <StatusBadge status={result.status} />
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
        id={result.id}
        transitions={transitions}
        action={transitionResultAction}
      />

      {editable ? (
        <ResultForm
          action={updateResultAction.bind(null, id)}
          initial={result}
          exams={exams}
          admitCards={admitCards}
          answerKeys={answerKeys}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This result is {result.status.toLowerCase().replace("_", " ")} and
          you don&apos;t have permission to edit it further.
        </p>
      )}
    </div>
  );
}
