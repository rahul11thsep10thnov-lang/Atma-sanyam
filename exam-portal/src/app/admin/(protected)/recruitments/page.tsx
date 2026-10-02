import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listRecruitmentsForAdmin } from "@/lib/services/catalogue";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/format";
import { setRecruitmentStatusAction } from "./actions";

export const metadata: Metadata = { title: "Recruitments" };

export default async function RecruitmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; saved?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const list = await listRecruitmentsForAdmin({ q: sp.q?.trim() || undefined, status: sp.status || undefined, page: Number(sp.page ?? 1) || 1 });
  const canEdit = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";
  const returnTo = `/admin/recruitments?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}) })}`;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Recruitments</h1>
        <p className="mt-1 text-sm text-slate-600">The central object: one recruitment per advertisement, with every notice (job, admit card, answer key, result, corrigendum) attached to it. {list.total} total.</p>
      </div>
      {sp.saved ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Saved.</p> : null}
      <form method="get" className="flex items-end gap-3">
        <label className="text-xs text-slate-600">Search<input name="q" defaultValue={sp.q ?? ""} className="mt-1 block w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="title or organization" /></label>
        <label className="text-xs text-slate-600">Status<select name="status" defaultValue={sp.status ?? ""} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">All</option>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase"><tr><th className="px-3 py-2">Recruitment</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Organization</th><th className="px-3 py-2">Categories</th><th className="px-3 py-2">Apply by</th><th className="px-3 py-2">Exam date</th><th className="px-3 py-2">Attached</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {list.rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">
                  <Link href={`/admin/automation/inbox?q=${encodeURIComponent(r.title)}&status=ALL`} className="font-medium text-slate-900 hover:underline">{r.title}</Link>
                  {r.isAutoCreated ? <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">auto</span> : null}
                  <div className="text-xs text-slate-500">{r.year ?? ""}{r.exam ? ` · ${r.exam.title}` : ""} · <Link href={`/recruitments/${r.slug}`} className="text-brand-700 hover:underline">/recruitments/{r.slug}</Link></div>
                </td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2 text-slate-700">{r.organization.name}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.categories.map((c) => c.category.name).join(", ") || "—"}</td>
                <td className="px-3 py-2 text-slate-600">{formatDate(r.applicationEndDate) ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{formatDate(r.examDate) ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r._count.notices} notices · {r._count.jobs} jobs · {r._count.admitCards} admit · {r._count.answerKeys} keys · {r._count.results} results</td>
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <form action={setRecruitmentStatusAction}>
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="status" value={r.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED"} />
                      <button className={r.status === "PUBLISHED" ? "text-slate-500 hover:underline" : "text-emerald-700 hover:underline"}>{r.status === "PUBLISHED" ? "Archive" : "Publish"}</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {list.rows.length === 0 ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No recruitments yet — they appear as the pipeline resolves notices.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {list.pages > 1 ? <div className="flex gap-3 text-sm">{list.page > 1 ? <Link href={`${returnTo}&page=${list.page - 1}`} className="text-brand-700 hover:underline">Previous</Link> : null}{list.page < list.pages ? <Link href={`${returnTo}&page=${list.page + 1}`} className="text-brand-700 hover:underline">Next</Link> : null}</div> : null}
    </div>
  );
}
