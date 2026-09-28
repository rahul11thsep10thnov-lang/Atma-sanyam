import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getJobForAdmin } from "@/lib/services/jobs";
import { listExamsForSelect } from "@/lib/services/lookups";
import { availableTransitions } from "@/lib/services/workflow";
import { canEditContent } from "@/lib/services/ownership";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { JobForm } from "../../JobForm";
import { updateJobAction, transitionJobAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Job" };

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = await requireAdmin();
  const job = await getJobForAdmin(id);
  if (!job) notFound();

  const exams = await listExamsForSelect();

  const editable = canEditContent(job, admin);
  let transitions = availableTransitions(job.status, admin.role);
  if (admin.role === "AUTHOR" && !editable) {
    transitions = transitions.filter((t) => t !== "SUBMIT_FOR_REVIEW");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Edit Job</h1>
        <StatusBadge status={job.status} />
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

      <StatusActions id={job.id} transitions={transitions} action={transitionJobAction} />

      {editable ? (
        <JobForm
          action={updateJobAction.bind(null, id)}
          initial={job}
          exams={exams}
          submitLabel="Save Changes"
        />
      ) : (
        <p className="text-sm text-slate-500">
          This job is {job.status.toLowerCase().replace("_", " ")} and you
          don&apos;t have permission to edit it further.
        </p>
      )}
    </div>
  );
}
