import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getSyllabusForAdmin } from "@/lib/services/syllabi";
import { listExamsForSelect } from "@/lib/services/lookups";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { SyllabusTreeEditor } from "@/components/admin/SyllabusTreeEditor";
import { SyllabusForm } from "../../SyllabusForm";
import {
  updateSyllabusAction,
  transitionSyllabusAction,
  addPaperAction,
  deletePaperAction,
  addSubjectAction,
  deleteSubjectAction,
  addTopicAction,
  deleteTopicAction,
} from "../../actions";

export const metadata: Metadata = { title: "Edit Syllabus" };

export default async function EditSyllabusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const syllabus = await getSyllabusForAdmin(id);
  if (!syllabus) notFound();

  const exams = await listExamsForSelect();

  const editable = canEditContent(syllabus, admin);
  let transitions = availableTransitions(syllabus.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Syllabus</h1>
        <StatusBadge status={syllabus.status} />
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
        id={syllabus.id}
        transitions={transitions}
        action={transitionSyllabusAction}
      />

      {editable ? (
        <SyllabusForm
          action={updateSyllabusAction.bind(null, id)}
          initial={syllabus}
          exams={exams}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This syllabus is {syllabus.status.toLowerCase().replace("_", " ")}{" "}
          and you don&apos;t have permission to edit its details further.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Structure</h2>
        {editable ? (
          <SyllabusTreeEditor
            syllabus={syllabus}
            actions={{
              addPaper: addPaperAction,
              deletePaper: deletePaperAction,
              addSubject: addSubjectAction,
              deleteSubject: deleteSubjectAction,
              addTopic: addTopicAction,
              deleteTopic: deleteTopicAction,
            }}
          />
        ) : (
          <p className="text-sm text-slate-500">
            You don&apos;t have permission to edit the structure of this
            syllabus.
          </p>
        )}
      </div>
    </div>
  );
}
