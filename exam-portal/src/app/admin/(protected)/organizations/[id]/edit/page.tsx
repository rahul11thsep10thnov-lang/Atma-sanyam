import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getOrganizationForAdmin, ORGANIZATION_TYPES } from "@/lib/services/catalogue";
import { OrganizationForm } from "./OrganizationForm";
import { addAliasAction, removeAliasAction, mergeOrganizationAction } from "../../actions";

export const metadata: Metadata = { title: "Edit organization" };

export default async function EditOrganizationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string; merged?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const org = await getOrganizationForAdmin(id);
  if (!org) notFound();
  const [states, others] = await Promise.all([
    prisma.state.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.organization.findMany({ where: { NOT: { id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const canEdit = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/organizations" className="text-xs text-slate-500 hover:underline">← Organizations</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{org.name}{org.isAutoCreated ? <span className="ml-2 align-middle rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">auto-created</span> : null}</h1>
        <p className="mt-1 text-sm text-slate-600">{org._count.exams} exams · {org._count.recruitments} recruitments · {org._count.notices} notices · {org._count.sources} sources · {org._count.jobs} jobs</p>
      </div>
      {sp.saved ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Saved.</p> : null}
      {sp.merged ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Merged.</p> : null}
      {sp.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{sp.error}</p> : null}

      {canEdit ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <OrganizationForm org={{ id: org.id, name: org.name, shortName: org.shortName, organizationType: org.organizationType, stateId: org.stateId, website: org.website, description: org.description }} types={ORGANIZATION_TYPES} states={states} />
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Aliases</h2>
        <p className="text-xs text-slate-500">Every spelling the pipeline should treat as this organization (matching ignores case and punctuation).</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {org.aliases.map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700">
              {a.alias}
              {canEdit ? <form action={removeAliasAction}><input type="hidden" name="id" value={org.id} /><input type="hidden" name="aliasId" value={a.id} /><button className="ml-1 text-slate-400 hover:text-red-600" aria-label={`Remove alias ${a.alias}`}>×</button></form> : null}
            </li>
          ))}
          {org.aliases.length === 0 ? <li className="text-xs text-slate-400">none</li> : null}
        </ul>
        {canEdit ? (
          <form action={addAliasAction} className="mt-3 flex items-end gap-2">
            <input type="hidden" name="id" value={org.id} />
            <label className="text-xs text-slate-600">Add alias<input name="alias" className="mt-1 block w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="e.g. UPPRPB, U.P. Police Board" required /></label>
            <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Add</button>
          </form>
        ) : null}
      </section>

      {canEdit ? (
        <section className="rounded-lg border border-red-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Merge into another organization</h2>
          <p className="text-xs text-slate-500">Use when the pipeline created a second copy of an existing organization. Everything linked here (exams, recruitments, notices, sources, jobs) moves to the target, this name becomes an alias there, and this row is deleted.</p>
          <form action={mergeOrganizationAction} className="mt-3 flex items-end gap-2">
            <input type="hidden" name="id" value={org.id} />
            <label className="text-xs text-slate-600">Target<select name="intoId" className="mt-1 block w-96 rounded-md border border-slate-300 px-2 py-1.5 text-sm" required><option value="">— choose —</option>{others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
            <button className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Merge and delete this one</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
