import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { listCategoriesForAdmin } from "@/lib/services/catalogue";
import { createCategoryAction, renameCategoryAction } from "./actions";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const cats = await listCategoriesForAdmin();
  const canEdit = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Categories</h1>
        <p className="mt-1 text-sm text-slate-600">Job categories the pipeline assigns from keywords (UPSC, SSC, Railway, Banking, Defence, Police, Teaching, State PSC) plus anything you add.</p>
      </div>
      {sp.saved ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Saved.</p> : null}
      {sp.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{sp.error}</p> : null}
      {canEdit ? (
        <form action={createCategoryAction} className="flex items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
          <label className="text-xs text-slate-600">New category<input name="name" className="mt-1 block w-64 rounded-md border border-slate-300 px-2 py-1.5 text-sm" required /></label>
          <label className="text-xs text-slate-600">Parent<select name="parentId" className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">— none —</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">Add</button>
        </form>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase"><tr><th className="px-3 py-2">Category</th><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Parent</th><th className="px-3 py-2">Exams</th><th className="px-3 py-2">Recruitments</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{c.name}{c.isAutoCreated ? <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">auto-created</span> : null}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{c.slug}</td>
                <td className="px-3 py-2 text-slate-600">{c.parent?.name ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{c._count.exams}</td>
                <td className="px-3 py-2 text-slate-600">{c._count.recruitmentCategories}</td>
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <form action={renameCategoryAction} className="flex justify-end gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input name="name" defaultValue={c.name} className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs" aria-label={`Rename ${c.name}`} />
                      <button className="text-brand-700 hover:underline">Rename</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
