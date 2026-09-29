"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  JOB_NOTIFICATION: "Job Notification",
  RESULT: "Result",
  ADMIT_CARD: "Admit Card",
  ANSWER_KEY: "Answer Key",
  SYLLABUS: "Syllabus",
  ADMISSION: "Admission",
  SCHOLARSHIP: "Scholarship",
  OTHER: "Other",
};

/** Section 33's "DocumentUploader" component. PDF-only, 20 MB limit —
 * enforced again server-side in `uploadDocument` regardless of what the
 * browser's `accept`/`required` attributes suggest (Section 34: never
 * trust client-side validation alone). */
export function DocumentUploader({
  action,
  exams,
  organizations,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  exams: Array<{ id: string; title: string }>;
  organizations: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="flex max-w-2xl flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700">PDF File (max 20 MB)</span>
        <input type="file" name="file" accept="application/pdf" required className={inputClass} />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Document Type</span>
          <select name="documentType" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Exam (optional)</span>
          <select name="examId" defaultValue="" className={inputClass}>
            <option value="">None</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Organization (optional)</span>
          <select name="organizationId" defaultValue="" className={inputClass}>
            <option value="">None</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            Official Source URL (recommended)
          </span>
          <input
            type="url"
            name="sourceUrl"
            placeholder="https://…"
            className={inputClass}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
