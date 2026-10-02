"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";
import {
  SOURCE_TYPES,
  SOURCE_PRIORITIES,
  DEFAULT_FREQUENCY_MINUTES,
} from "@/lib/validation/source";

export interface SourceFormValues {
  name?: string;
  organizationId?: string | null;
  listingUrl?: string;
  officialDomain?: string;
  sourceType?: string;
  rssUrl?: string | null;
  apiUrl?: string | null;
  parserType?: string | null;
  priority?: string;
  checkFrequencyMinutes?: number;
  active?: boolean;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export function SourceForm({
  action,
  initial,
  organizations,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: SourceFormValues;
  organizations: Array<{ id: string; name: string }>;
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

      <Field label="Name">
        <input
          name="name"
          defaultValue={initial?.name}
          required
          minLength={2}
          maxLength={200}
          placeholder="e.g. SSC — Notice Board"
          className={inputClass}
        />
      </Field>

      <Field label="Listing URL (the page or feed to watch)">
        <input
          type="url"
          name="listingUrl"
          defaultValue={initial?.listingUrl}
          required
          placeholder="https://ssc.gov.in/..."
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Organization (optional — auto-detected per notice if blank)">
          <select
            name="organizationId"
            defaultValue={initial?.organizationId ?? ""}
            className={inputClass}
          >
            <option value="">Not linked</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Official domain (derived from URL if blank)">
          <input
            name="officialDomain"
            defaultValue={initial?.officialDomain ?? ""}
            placeholder="ssc.gov.in"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Source type">
          <select name="sourceType" defaultValue={initial?.sourceType ?? "HTML"} className={inputClass}>
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select name="priority" defaultValue={initial?.priority ?? "NORMAL"} className={inputClass}>
            {SOURCE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p} (default every {DEFAULT_FREQUENCY_MINUTES[p]} min)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Check every (minutes)">
          <input
            type="number"
            name="checkFrequencyMinutes"
            defaultValue={initial?.checkFrequencyMinutes ?? 360}
            min={5}
            max={10080}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="RSS URL (optional)">
          <input type="url" name="rssUrl" defaultValue={initial?.rssUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="API URL (optional)">
          <input type="url" name="apiUrl" defaultValue={initial?.apiUrl ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="Parser hint (optional, e.g. a CSS selector for the notices list)">
        <input
          name="parserType"
          defaultValue={initial?.parserType ?? ""}
          placeholder="table.notices a"
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
        Active (checked by the pipeline)
      </label>

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
