import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminApi } from "@/lib/auth/session";
import { getExtractionJob } from "@/lib/services/extraction";
import { formatDate } from "@/lib/format";
import {
  acceptFieldAction,
  editFieldAction,
  rejectFieldAction,
  approveJobAction,
  rejectJobAction,
} from "./actions";
import { DECISION_PREFIX } from "@/lib/services/extractionReview";

export const metadata: Metadata = { title: "Extraction job" };

const REVIEW_ROLES = ["REVIEWER", "EDITOR", "SUPER_ADMIN"];
const REVIEWABLE_JOB_STATUSES = ["READY_FOR_REVIEW", "UNDER_REVIEW"];

export default async function ExtractionJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdminApi();
  const { jobId } = await params;
  const { error } = await searchParams;
  const job = await getExtractionJob(jobId);
  if (!job) notFound();

  const canReview = REVIEW_ROLES.includes(admin.role) && REVIEWABLE_JOB_STATUSES.includes(job.status);
  const allReviewed = job.results.every((r) => r.overrides.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/documents" className="text-sm text-brand-700 hover:underline">
          ← Back to documents
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Extraction job — {job.document.filename}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Attempt #{job.attempt} · Status <span className="font-medium">{job.status}</span> ·
          Model <span className="font-mono">{job.aiModel ?? "—"}</span> ·{" "}
          {formatDate(job.createdAt)}
        </p>
        {job.error ? (
          <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {job.error}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This is AI-extracted data. Nothing here is used to create or
          update published content automatically — a human must accept,
          edit, or reject every field, and approve the job as a whole,
          before this data means anything downstream.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Original document</h2>
          <a
            href={job.document.storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-700 hover:underline"
          >
            Open {job.document.filename} in a new tab ↗
          </a>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <iframe
              src={job.document.storageUrl}
              title="Original document"
              className="h-[70vh] w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Extracted fields</h2>
          {job.results.map((result) => {
            const latestOverride = result.overrides.at(-1);
            const decision = latestOverride
              ? latestOverride.reason?.startsWith(DECISION_PREFIX.REJECTED)
                ? "Rejected"
                : "Reviewed"
              : "Pending review";
            const defaultValue =
              latestOverride && latestOverride.humanValue !== null
                ? String(latestOverride.humanValue)
                : result.value == null
                  ? ""
                  : String(result.value);

            return (
              <div key={result.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-700">{result.fieldPath}</span>
                  <div className="flex items-center gap-2">
                    {result.isUncertain ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Uncertain
                      </span>
                    ) : null}
                    <span
                      className={
                        decision === "Rejected"
                          ? "inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"
                          : decision === "Reviewed"
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                            : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {decision}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  AI value: {result.value == null ? "— not extracted —" : String(result.value)} ·{" "}
                  {result.confidence == null ? "" : `${Math.round(result.confidence * 100)}% confidence`}
                  {result.sourcePage ? ` · page ${result.sourcePage}` : ""}
                </p>

                {canReview ? (
                  <form className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="resultId" value={result.id} />
                    <input type="hidden" name="jobId" value={job.id} />
                    <input
                      type="text"
                      name="humanValue"
                      defaultValue={defaultValue}
                      placeholder="Human value"
                      className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      name="reason"
                      placeholder="Reason (for reject)"
                      className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="submit"
                      formAction={acceptFieldAction}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Accept AI value
                    </button>
                    <button
                      type="submit"
                      formAction={editFieldAction}
                      className="rounded-md bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800"
                    >
                      Save edit
                    </button>
                    <button
                      type="submit"
                      formAction={rejectFieldAction}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
          {job.results.length === 0 ? (
            <p className="text-sm text-slate-500">No fields extracted.</p>
          ) : null}
        </div>
      </div>

      {canReview ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <form>
            <input type="hidden" name="jobId" value={job.id} />
            <button
              type="submit"
              formAction={approveJobAction}
              disabled={!allReviewed}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Approve job
            </button>
          </form>
          {!allReviewed ? (
            <p className="text-xs text-slate-500">
              Every field needs a reviewer decision before the job can be approved.
            </p>
          ) : null}
          <form className="flex items-center gap-2">
            <input type="hidden" name="jobId" value={job.id} />
            <input
              type="text"
              name="reason"
              placeholder="Reason for rejecting the whole job"
              className="w-64 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              formAction={rejectJobAction}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Reject job
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
