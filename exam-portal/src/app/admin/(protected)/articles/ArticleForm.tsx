"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export interface ArticleFormValues {
  title?: string;
  description?: string | null;
  body?: string;
  coverImageUrl?: string | null;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export function ArticleForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ArticleFormValues;
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

      <Field label="Summary">
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={2}
          className={inputClass}
        />
      </Field>

      <Field label="Cover Image URL">
        <input
          type="url"
          name="coverImageUrl"
          defaultValue={initial?.coverImageUrl ?? ""}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>

      <Field label="Body (Markdown)">
        <textarea
          name="body"
          defaultValue={initial?.body ?? ""}
          required
          rows={14}
          className={`${inputClass} font-mono`}
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
