import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/master/repo";
import { sectionBySlug } from "@/lib/admin/sections";

export function generateMetadata({ params }: { params: { section: string } }): Metadata {
  const s = sectionBySlug(params.section);
  return { title: s ? `Admin — ${s.title}` : "Admin" };
}


export default function AdminSectionPage({ params }: { params: { section: string } }) {
  const section = sectionBySlug(params.section);
  if (!section) notFound();
  const tables = section.build(getDb());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal">{section.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-charcoal-light">{section.description}</p>
      </div>
      {tables.map((t) => (
        <section key={t.title}>
          <h2 className="font-display text-lg font-semibold text-forest-700">
            {t.title} <span className="text-sm font-normal text-charcoal-light">({t.total})</span>
          </h2>
          {t.note && <p className="mt-1 text-xs text-charcoal-light">{t.note}</p>}
          {t.rows.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-charcoal/25 bg-white p-4 text-sm text-charcoal-light">Nothing here.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-forest-100">
              <table className="min-w-full divide-y divide-forest-100 text-sm">
                <thead className="bg-forest-50">
                  <tr>
                    {t.columns.map((c) => (
                      <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-forest-700">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-100 bg-white">
                  {t.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 align-top text-charcoal-light">{cell ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {t.total > t.rows.length && <p className="mt-2 text-xs text-charcoal-light">Showing the first {t.rows.length} of {t.total}.</p>}
        </section>
      ))}
    </div>
  );
}

