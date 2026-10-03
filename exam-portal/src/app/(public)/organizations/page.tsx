import type { Metadata } from "next";
import Link from "next/link";
import { listPublicOrganizations } from "@/lib/services/recruitments";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Recruiting Organizations",
  description: "Commissions, boards, PSUs and departments with published recruitments and exams.",
  alternates: { canonical: "/organizations" },
};

const TYPE_LABEL: Record<string, string> = { CENTRAL: "Central", STATE: "State", PSU: "PSU", UNIVERSITY: "University", COURT: "Court", DEFENCE: "Defence", MUNICIPAL: "Municipal", AUTONOMOUS: "Autonomous", OTHER: "Other" };

export default async function OrganizationsIndexPage() {
  const orgs = await listPublicOrganizations();
  const groups = new Map<string, typeof orgs>();
  for (const o of orgs) {
    const k = TYPE_LABEL[o.organizationType ?? "OTHER"] ?? "Other";
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  return (
    <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Organizations" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Recruiting Organizations</h1>
      {orgs.length === 0 ? <EmptyState message="No organizations with published recruitments yet." /> : null}
      {[...groups.entries()].map(([group, list]) => (
        <section key={group} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{group}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((o) => (
              <li key={o.slug}>
                <Link href={`/organization/${o.slug}`} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-600">
                  <span className="text-sm font-medium text-slate-900">{o.name}</span>
                  <span className="text-xs text-slate-500">{[o.shortName, o.state?.name].filter(Boolean).join(" · ")}</span>
                  <span className="text-xs text-slate-500">{o._count.recruitments} recruitment{o._count.recruitments === 1 ? "" : "s"} · {o._count.exams} exam{o._count.exams === 1 ? "" : "s"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
