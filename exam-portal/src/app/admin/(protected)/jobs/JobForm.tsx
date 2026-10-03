"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";
import { readPosts, readFees, readDates, postsToText, feesToText, datesToText } from "@/lib/jobDetails";

export interface JobFormValues {
  title?: string;
  description?: string | null;
  examId?: string;
  advertisementNumber?: string | null;
  vacancies?: number | null;
  qualification?: string | null;
  ageLimitMin?: number | null;
  ageLimitMax?: number | null;
  applicationFee?: unknown;
  officialWebsite?: string | null;
  applyUrl?: string | null;
  eligibility?: string | null;
  selectionProcess?: unknown;
  salary?: string | null;
  applicationEndDate?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  posts?: unknown;
  applicationFeeByCategory?: unknown;
  importantDates?: unknown;
  syllabusUrl?: string | null;
  examPatternUrl?: string | null;
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function toLines(value: unknown): string {
  if (Array.isArray(value)) return value.join("\n");
  return "";
}

export function JobForm({
  action,
  initial,
  exams,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: JobFormValues;
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
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Advertisement Number">
          <input
            name="advertisementNumber"
            defaultValue={initial?.advertisementNumber ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Vacancies">
          <input
            type="number"
            min={0}
            name="vacancies"
            defaultValue={initial?.vacancies ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Educational Qualification">
        <input
          name="qualification"
          defaultValue={initial?.qualification ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Minimum Age">
          <input
            type="number"
            min={0}
            name="ageLimitMin"
            defaultValue={initial?.ageLimitMin ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Maximum Age">
          <input
            type="number"
            min={0}
            name="ageLimitMax"
            defaultValue={initial?.ageLimitMax ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Application Fee (₹)">
          <input
            type="number"
            min={0}
            step="0.01"
            name="applicationFee"
            defaultValue={
              initial?.applicationFee != null ? String(initial.applicationFee) : ""
            }
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Application Last Date">
        <input
          type="date"
          name="applicationEndDate"
          defaultValue={toDateInputValue(initial?.applicationEndDate)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Official Website">
          <input
            type="url"
            name="officialWebsite"
            defaultValue={initial?.officialWebsite ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        <Field label="Apply Online URL">
          <input
            type="url"
            name="applyUrl"
            defaultValue={initial?.applyUrl ?? ""}
            placeholder="https://…"
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

      <Field label="Selection Process (one stage per line)">
        <textarea
          name="selectionProcess"
          defaultValue={toLines(initial?.selectionProcess)}
          rows={3}
          placeholder={"Tier 1\nTier 2\nInterview"}
          className={inputClass}
        />
      </Field>

      <Field label="Salary / Pay Level">
        <input name="salary" defaultValue={initial?.salary ?? ""} className={inputClass} />
      </Field>

      <fieldset className="flex flex-col gap-4 rounded-md border border-orange-200 p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-slate-500 uppercase">Job page tables (one row per line)</legend>
        <Field label="Posts — Post | Eligibility | Vacancies">
          <textarea name="postsText" rows={5} defaultValue={postsToText(readPosts(initial?.posts))} placeholder={"Constable (Civil Police) | 12th pass, 18–22 years | 52000\nJail Warder | 12th pass | 8244"} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Fees — Category | Fee">
          <textarea name="feesText" rows={4} defaultValue={feesToText(readFees(initial?.applicationFeeByCategory))} placeholder={"General / OBC / EWS | ₹400\nSC / ST | ₹400\nFemale | ₹400"} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Extra important dates — Label | Date">
          <textarea name="datesText" rows={4} defaultValue={datesToText(readDates(initial?.importantDates))} placeholder={"Fee payment last date | 18 Jan 2027\nCorrection window | 20–22 Jan 2027"} className={`${inputClass} font-mono`} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Syllabus URL (optional)"><input name="syllabusUrl" type="url" defaultValue={initial?.syllabusUrl ?? ""} className={inputClass} /></Field>
          <Field label="Exam pattern URL (optional)"><input name="examPatternUrl" type="url" defaultValue={initial?.examPatternUrl ?? ""} className={inputClass} /></Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-md border border-slate-200 p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
          SEO
        </legend>
        <Field label="SEO Title">
          <input
            name="seoTitle"
            defaultValue={initial?.seoTitle ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="SEO Description">
          <textarea
            name="seoDescription"
            defaultValue={initial?.seoDescription ?? ""}
            rows={2}
            className={inputClass}
          />
        </Field>
        <Field label="SEO Keywords (comma-separated)">
          <input
            name="seoKeywords"
            defaultValue={(initial?.seoKeywords ?? []).join(", ")}
            className={inputClass}
          />
        </Field>
      </fieldset>

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
