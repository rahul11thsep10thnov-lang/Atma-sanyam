"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export interface AdmitCardFormValues {
  title?: string;
  description?: string | null;
  examId?: string;
  releaseDate?: Date | null;
  examDate?: Date | null;
  downloadUrl?: string | null;
  officialWebsite?: string | null;
  instructions?: string | null;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function AdmitCardForm({
  action,
  initial,
  exams,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: AdmitCardFormValues;
  exams: Array<{ id: string; title: string }>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Field label="Title">
        <input
          name="title"
          defaultValue={initial?.title}
          required
          minLength={3}
          maxLength={200}
          className={inputClass}
        />
      </Field>

      <Field label="Exam">
        <select name="examId" defaultValue={initial?.examId} required className={inputClass}>
          <option value="" disabled>
            Select…
          </option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={2}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Release Date">
          <input
            type="date"
            name="releaseDate"
            defaultValue={toDateInputValue(initial?.releaseDate)}
            className={inputClass}
          />
        </Field>
        <Field label="Exam Date">
          <input
            type="date"
            name="examDate"
            defaultValue={toDateInputValue(initial?.examDate)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Download Link">
          <input
            type="url"
            name="downloadUrl"
            defaultValue={initial?.downloadUrl ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        <Field label="Official Website">
          <input
            type="url"
            name="officialWebsite"
            defaultValue={initial?.officialWebsite ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Instructions">
        <textarea
          name="instructions"
          defaultValue={initial?.instructions ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
