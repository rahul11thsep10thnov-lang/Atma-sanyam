import { prisma } from "@/lib/db/prisma";
import { QUALIFICATION_LEVELS } from "@/lib/qualifications";
import { Suspense } from "react";
import { BigSearchDefaults } from "./BigSearchDefaults";

/** Three-part job search (State · Minimum qualification · Exam name).
 * A plain GET form to /jobs — works without JavaScript; any one field is
 * enough, results are newest first. */
export async function BigSearch() {
  const states = await prisma.state.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, code: true } });
  const field = "flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-transparent focus-within:ring-2 focus-within:ring-[#e0823f]";
  return (
    <section aria-label="Search jobs" className="w-full px-4 py-5 sm:px-8 lg:px-12">
      <form id="big-search" action="/jobs" method="GET" className="flex w-full flex-col gap-1.5 rounded-2xl bg-[#f6a35e] p-1.5 shadow-lg lg:flex-row" role="search">
        <label className={field}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#6b3412]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">State</span>
            <select name="state" className="w-full truncate bg-transparent text-base text-slate-900 outline-none">
              <option value="">Any state</option>
              {states.map((s) => <option key={s.slug} value={s.slug}>{s.code === "ALL_INDIA" ? "All India (central jobs)" : s.name}</option>)}
            </select>
          </span>
        </label>
        <label className={field}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#6b3412]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-5 9 5-9 5-9-5Z" /><path d="M7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" /></svg>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Minimum qualification</span>
            <select name="qualification" className="w-full bg-transparent text-base text-slate-900 outline-none">
              <option value="">Any qualification</option>
              {QUALIFICATION_LEVELS.map((q) => <option key={q.code} value={q.code}>{q.label}</option>)}
            </select>
          </span>
        </label>
        <label className={`${field} lg:flex-[1.3]`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#6b3412]" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Exam name</span>
            <input name="q" type="search" placeholder="e.g. SSC CGL, UP Police, NTPC" className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" maxLength={100} />
          </span>
        </label>
        <Suspense fallback={null}>
          <BigSearchDefaults />
        </Suspense>
        <button type="submit" className="rounded-xl bg-[#6b3412] px-8 py-4 text-lg font-bold text-white shadow hover:bg-[#4a220a] lg:py-0">Search</button>
      </form>
    </section>
  );
}
