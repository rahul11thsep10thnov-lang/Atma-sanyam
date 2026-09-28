"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export interface ResultFormValues {
  title?: string;
  description?: string | null;
  examId?: string;
  resultDate?: Date | null;
  resultUrl?: string | null;
  officialWebsite?: string | null;
  relatedAdmitCardId?: string | null;
  relatedAnswerKeyId?: string | null;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function ResultForm({
  action,
  initial,
  exams,
  admitCards,
  answerKeys,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ResultFormValues;
  exams: Array<{ id: string; title: string }>;
  admitCards: Array<{ id: string; title: string }>;
  answerKeys: Array<{ id: string; title: string }>;
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

      <Field label="Important Information">
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Result Date">
          <input
            type="date"
            name="resultDate"
            defaultValue={toDateInputValue(initial?.resultDate)}
            className={inputClass}
          />
        </Field>
        <Field label="Result Link">
          <input
            type="url"
            name="resultUrl"
            defaultValue={initial?.resultUrl ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Official Website">
        <input
          type="url"
          name="officialWebsite"
          defaultValue={initial?.officialWebsite ?? ""}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Related Admit Card">
          <select
            name="relatedAdmitCardId"
            defaultValue={initial?.relatedAdmitCardId ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {admitCards.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Related Answer Key">
          <select
            name="relatedAnswerKeyId"
            defaultValue={initial?.relatedAnswerKeyId ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {answerKeys.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

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
