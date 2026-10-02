"use client";

import { useActionState } from "react";
import { updateNoticeAction, type FormState } from "../actions";

export interface EditableNotice {
  id: string;
  title: string;
  titleHi: string | null;
  summary: string | null;
  summaryHi: string | null;
  noticeType: string;
  priority: string;
  examId: string | null;
  recruitmentId: string | null;
  extracted: Record<string, unknown>;
}

const input = "mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";
const label = "block text-xs font-medium text-slate-600";

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

export function NoticeEditForm({
  notice,
  noticeTypes,
  priorities,
  exams,
  recruitments,
}: {
  notice: EditableNotice;
  noticeTypes: string[];
  priorities: string[];
  exams: Array<{ id: string; title: string }>;
  recruitments: Array<{ id: string; title: string }>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateNoticeAction, {});
  const x = notice.extracted;
  return (
    <form action={action} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <input type="hidden" name="id" value={notice.id} />
      {state.error ? <p role="alert" className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <label className={`${label} md:col-span-2`}>Title (English)<input name="title" defaultValue={notice.title} className={input} required /></label>
      <label className={`${label} md:col-span-2`}>Title (हिन्दी)<input name="titleHi" defaultValue={notice.titleHi ?? ""} className={input} lang="hi" /></label>
      <label className={label}>Notice type
        <select name="noticeType" defaultValue={notice.noticeType} className={input}>{noticeTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select>
      </label>
      <label className={label}>Priority
        <select name="priority" defaultValue={notice.priority} className={input}>{priorities.map((p) => <option key={p} value={p}>{p}</option>)}</select>
      </label>
      <label className={label}>Exam
        <select name="examId" defaultValue={notice.examId ?? ""} className={input}>
          <option value="">— none —</option>
          {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </label>
      <label className={label}>Recruitment
        <select name="recruitmentId" defaultValue={notice.recruitmentId ?? ""} className={input}>
          <option value="">— none —</option>
          {recruitments.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
      </label>
      <label className={label}>Advertisement no.<input name="advertisement_number" defaultValue={str(x.advertisement_number)} className={input} /></label>
      <label className={label}>Vacancies<input name="vacancies" type="number" min={0} defaultValue={str(x.vacancies)} className={input} /></label>
      <label className={label}>Application start (yyyy-mm-dd)<input name="application_start_date" defaultValue={str(x.application_start_date)} className={input} placeholder="2027-01-01" /></label>
      <label className={label}>Application end (yyyy-mm-dd)<input name="application_end_date" defaultValue={str(x.application_end_date)} className={input} placeholder="2027-01-31" /></label>
      <label className={label}>Exam date<input name="exam_date" defaultValue={str(x.exam_date)} className={input} /></label>
      <label className={label}>Admit card date<input name="admit_card_date" defaultValue={str(x.admit_card_date)} className={input} /></label>
      <label className={label}>Result date<input name="result_date" defaultValue={str(x.result_date)} className={input} /></label>
      <label className={label}>Application fee<input name="application_fee" defaultValue={str(x.application_fee)} className={input} placeholder="Rs. 100" /></label>
      <label className={`${label} md:col-span-2`}>Salary / pay scale<input name="salary" defaultValue={str(x.salary)} className={input} /></label>
      <label className={label}>Official notification URL<input name="official_notification_url" type="url" defaultValue={str(x.official_notification_url)} className={input} /></label>
      <label className={label}>Apply online URL<input name="official_apply_url" type="url" defaultValue={str(x.official_apply_url)} className={input} /></label>
      <label className={`${label} md:col-span-2`}>Summary (English)<textarea name="summary" defaultValue={notice.summary ?? ""} rows={3} className={input} /></label>
      <label className={`${label} md:col-span-2`}>Summary (हिन्दी)<textarea name="summaryHi" defaultValue={notice.summaryHi ?? ""} rows={3} className={input} lang="hi" /></label>
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">{pending ? "Saving…" : "Save corrections"}</button>
        <span className="ml-3 text-xs text-slate-500">Corrected fields are marked verified at 100% confidence.</span>
      </div>
    </form>
  );
}
