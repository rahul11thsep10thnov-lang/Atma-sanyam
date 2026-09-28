"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export interface ExamFormValues {
  title?: string;
  description?: string | null;
  organizationId?: string;
  categoryId?: string;
  stateId?: string | null;
  examDate?: Date | null;
  applicationStartDate?: Date | null;
  applicationEndDate?: Date | null;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function ExamForm({
  action,
  initial,
  organizations,
  categories,
  states,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ExamFormValues;
  organizations: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  states: Array<{ id: string; name: string }>;
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

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Organization">
          <select
            name="organizationId"
            defaultValue={initial?.organizationId}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Select…
            </option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category">
          <select
            name="categoryId"
            defaultValue={initial?.categoryId}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Select…
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="State">
          <select
            name="stateId"
            defaultValue={initial?.stateId ?? ""}
            className={inputClass}
          >
            <option value="">All India / not applicable</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Application Start Date">
          <input
            type="date"
            name="applicationStartDate"
            defaultValue={toDateInputValue(initial?.applicationStartDate)}
            className={inputClass}
          />
        </Field>
        <Field label="Application Last Date">
          <input
            type="date"
            name="applicationEndDate"
            defaultValue={toDateInputValue(initial?.applicationEndDate)}
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
