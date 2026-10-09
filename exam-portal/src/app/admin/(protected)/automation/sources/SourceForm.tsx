"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";
import {
  SOURCE_TYPES,
  SOURCE_PRIORITIES,
  SOURCE_CATEGORIES,
  SOURCE_CATEGORY_LABEL,
  DEFAULT_FREQUENCY_MINUTES,
} from "@/lib/validation/source";
import { REGIONS } from "@/lib/sources/regions";

export interface SourceFormValues {
  name?: string;
  organizationId?: string | null;
  listingUrl?: string;
  officialDomain?: string;
  sourceType?: string;
  category?: string;
  stateCode?: string | null;
  groupName?: string | null;
  rssUrl?: string | null;
  apiUrl?: string | null;
  parserType?: string | null;
  parserConfig?: unknown;
  paginationConfig?: unknown;
  priority?: string;
  checkFrequencyMinutes?: number;
  requestTimeoutMs?: number;
  minRequestIntervalMs?: number;
  isAggregator?: boolean;
  active?: boolean;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

const json = (v: unknown) => (v === null || v === undefined ? "" : JSON.stringify(v, null, 2));

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
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Field label="Name">
        <input name="name" defaultValue={initial?.name} required minLength={2} maxLength={200} placeholder="e.g. SSC — Notice Board" className={inputClass} />
      </Field>

      <Field label="Listing URL (the page or feed to watch)">
        <input type="url" name="listingUrl" defaultValue={initial?.listingUrl} required placeholder="https://ssc.gov.in/..." className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Category">
          <select name="category" defaultValue={initial?.category ?? "CENTRAL"} className={inputClass}>
            {SOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SOURCE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="State / UT (if any)">
          <select name="stateCode" defaultValue={initial?.stateCode ?? ""} className={inputClass}>
            <option value="">— Central / not state-specific —</option>
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name} ({r.code}){r.kind === "UT" ? " · UT" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Group (optional)">
          <input name="groupName" defaultValue={initial?.groupName ?? ""} placeholder="RRB, UP Recruitment…" className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Organization (optional — auto-detected per notice if blank)">
          <select name="organizationId" defaultValue={initial?.organizationId ?? ""} className={inputClass}>
            <option value="">Not linked</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Official domain (derived from URL if blank)">
          <input name="officialDomain" defaultValue={initial?.officialDomain ?? ""} placeholder="ssc.gov.in" className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Source type">
          <select name="sourceType" defaultValue={initial?.sourceType ?? "HTML"} className={inputClass}>
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "JSON" || t === "API" ? `${t} (needs parser config)` : t === "PDF" ? "PDF (single document / index)" : t}
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
          <input type="number" name="checkFrequencyMinutes" defaultValue={initial?.checkFrequencyMinutes ?? 240} min={5} max={10080} required className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Request timeout (ms)">
          <input type="number" name="requestTimeoutMs" defaultValue={initial?.requestTimeoutMs ?? 20000} min={2000} max={120000} className={inputClass} />
        </Field>
        <Field label="Rate limit: min gap between requests to this site (ms)">
          <input type="number" name="minRequestIntervalMs" defaultValue={initial?.minRequestIntervalMs ?? 1500} min={0} max={60000} className={inputClass} />
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

      <Field label="Region hint (optional CSS selector for the notices area)">
        <input name="parserType" defaultValue={initial?.parserType ?? ""} placeholder="table.notices" className={inputClass} />
      </Field>

      <details className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" open={!!initial?.parserConfig || !!initial?.paginationConfig}>
        <summary className="cursor-pointer font-medium text-slate-700">Advanced: per-site parser and pagination (JSON)</summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Parser configuration">
            <textarea
              name="parserConfig"
              defaultValue={json(initial?.parserConfig)}
              rows={7}
              placeholder={'{\n  "itemSelector": "table.notices tr",\n  "titleSelector": "td:nth-child(2)",\n  "dateSelector": "td:first-child",\n  "excludeUrlPattern": "/(tender|rti)/"\n}'}
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>
          <Field label="Pagination configuration">
            <textarea
              name="paginationConfig"
              defaultValue={json(initial?.paginationConfig)}
              rows={7}
              placeholder={'{ "type": "nextLink", "maxPages": 3 }\nor\n{ "type": "pattern", "urlTemplate": "https://x.gov.in/notices?page={page}", "maxPages": 3 }'}
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Parser fields: itemSelector, linkSelector, titleSelector, dateSelector, includeUrlPattern, excludeUrlPattern, keywordFilter, sameSiteOnly, maxItems; JSON
          sources: itemsPath, urlField, titleField, dateField. Pagination never leaves the site and stops at 10 pages.
        </p>
      </details>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="isAggregator" defaultChecked={initial?.isAggregator ?? false} className="mt-0.5" />
        <span>
          Public aggregator (discovery only) — notices always go to review, the official notice link is looked for, and the source stays disabled until
          verified and its terms reviewed.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
        Enabled (checked by the pipeline once approved)
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
