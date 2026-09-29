"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export interface AdmissionFormValues {
  title?: string;
  description?: string | null;
  organizationId?: string | null;
  categoryId?: string | null;
  stateId?: string | null;
  applicationStartDate?: Date | null;
  applicationEndDate?: Date | null;
  eligibility?: string | null;
  officialWebsite?: string | null;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function AdmissionForm({
  action,
  initial,
  organizations,
  categories,
  states,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: AdmissionFormValues;
  organizations: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  states: Array<{ id: string; name: string }>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

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
            defaultValue={initial?.organizationId ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            name="categoryId"
            defaultValue={initial?.categoryId ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="State">
          <select name="stateId" defaultValue={initial?.stateId ?? ""} className={inputClass}>
            <option value="">All India / not applicable</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      <Field label="Eligibility">
        <textarea
          name="eligibility"
          defaultValue={initial?.eligibility ?? ""}
          rows={2}
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
