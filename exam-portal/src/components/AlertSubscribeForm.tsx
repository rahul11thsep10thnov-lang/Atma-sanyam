"use client";

import { useActionState } from "react";
import { subscribeAction, type SubscribeState } from "@/app/(public)/alerts/actions";

const TYPE_OPTIONS: Array<{ value: string; en: string; hi: string }> = [
  { value: "JOB", en: "New recruitments", hi: "नई भर्तियाँ" },
  { value: "DEADLINE_EXTENSION", en: "Last-date extensions", hi: "अंतिम तिथि विस्तार" },
  { value: "ADMIT_CARD", en: "Admit cards", hi: "एडमिट कार्ड" },
  { value: "ANSWER_KEY", en: "Answer keys", hi: "उत्तर कुंजी" },
  { value: "RESULT", en: "Results", hi: "परिणाम" },
  { value: "EXAM_DATE", en: "Exam dates", hi: "परीक्षा तिथियाँ" },
];

export function AlertSubscribeForm({
  scope,
  lang = "en",
  compact = false,
  options,
}: {
  scope: { recruitmentId?: string; organizationId?: string; categoryId?: string; stateId?: string; label: string };
  lang?: "en" | "hi";
  compact?: boolean;
  options?: { categories?: Array<{ id: string; name: string }>; organizations?: Array<{ id: string; name: string }>; states?: Array<{ id: string; name: string }> };
}) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeAction, {});
  const hi = lang === "hi";
  const t = {
    title: hi ? "अलर्ट पाएँ" : "Get alerts",
    sub: hi ? `${scope.label} से जुड़ी हर आधिकारिक सूचना ई-मेल पर।` : `Every official update for ${scope.label}, by e-mail.`,
    email: hi ? "ई-मेल" : "E-mail",
    btn: hi ? "अलर्ट चालू करें" : "Subscribe",
    types: hi ? "किस बारे में" : "What about",
    prio: hi ? "न्यूनतम प्राथमिकता" : "Minimum priority",
    kw: hi ? "कीवर्ड (वैकल्पिक)" : "Keyword (optional)",
  };
  return (
    <form action={action} className={`flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4 ${compact ? "" : "sm:p-5"}`} aria-labelledby="alerts-heading">
      <div>
        <h2 id="alerts-heading" className="text-base font-semibold text-slate-900">{t.title}</h2>
        <p className="text-xs text-slate-600">{t.sub}</p>
      </div>
      {scope.recruitmentId ? <input type="hidden" name="recruitmentId" value={scope.recruitmentId} /> : null}
      {scope.organizationId ? <input type="hidden" name="organizationId" value={scope.organizationId} /> : null}
      {scope.categoryId ? <input type="hidden" name="categoryId" value={scope.categoryId} /> : null}
      {scope.stateId ? <input type="hidden" name="stateId" value={scope.stateId} /> : null}
      <input type="hidden" name="locale" value={lang} />
      {state.ok ? (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
          {state.devVerifyUrl ? <> <a href={state.devVerifyUrl} className="underline">(dev: confirm now)</a></> : null}
        </p>
      ) : (
        <>
          {state.error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-medium text-slate-600">
              {t.email}
              <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <button type="submit" disabled={pending} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{pending ? "…" : t.btn}</button>
          </div>
          {!compact ? (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer">{hi ? "विकल्प" : "Options"}</summary>
              <div className="mt-2 flex flex-col gap-2">
                <fieldset>
                  <legend className="font-medium">{t.types}</legend>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {TYPE_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-1"><input type="checkbox" name="noticeTypes" value={o.value} /> {hi ? o.hi : o.en}</label>
                    ))}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{hi ? "कुछ न चुनने पर सब कुछ।" : "Leave all unticked for everything."}</p>
                </fieldset>
                {options?.categories?.length ? (
                  <label>{hi ? "श्रेणी" : "Category"}<select name="categoryId" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5"><option value="">{hi ? "सभी" : "All"}</option>{options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                ) : null}
                {options?.organizations?.length ? (
                  <label>{hi ? "संगठन" : "Organization"}<select name="organizationId" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5"><option value="">{hi ? "सभी" : "All"}</option>{options.organizations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                ) : null}
                {options?.states?.length ? (
                  <label>{hi ? "राज्य" : "State"}<select name="stateId" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5"><option value="">{hi ? "सभी" : "All"}</option>{options.states.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                ) : null}
                <label>{t.kw}<input name="keyword" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5" placeholder={hi ? "जैसे कांस्टेबल" : "e.g. constable"} /></label>
                <label>{t.prio}<select name="minPriority" defaultValue="LOW" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5"><option value="LOW">{hi ? "सब कुछ" : "Everything"}</option><option value="NORMAL">{hi ? "सामान्य और ऊपर" : "Normal and above"}</option><option value="HIGH">{hi ? "उच्च और ऊपर" : "High and above"}</option><option value="URGENT">{hi ? "केवल तत्काल" : "Urgent only"}</option></select></label>
              </div>
            </details>
          ) : null}
          <p className="text-[11px] text-slate-500">{hi ? "हर ई-मेल में अनसब्सक्राइब लिंक होता है। हम आपका पता किसी से साझा नहीं करते।" : "Every e-mail has an unsubscribe link. Your address is never shared."}</p>
        </>
      )}
    </form>
  );
}
