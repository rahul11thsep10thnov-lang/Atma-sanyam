import type { Metadata } from "next";
import Link from "next/link";
import { lastReport } from "@/lib/cms/masterImport";
import { MasterImport } from "@/components/admin/cms/MasterImport";
import { PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — Master database import" };
export const dynamic = "force-dynamic";

export default function MasterImportPage({ params }: { params: { locale: string } }) {
  const base = `/${params.locale}/admin/cms`;
  const r = lastReport();
  const cell = "px-2 py-1 text-right tabular-nums";
  return (
    <div className="space-y-5">
      <PageHeader
        title="Master database import"
        intro="India Tourism Master Database workbook (Destinations, Trip Clusters, Schema, Categories). Existing records are linked, never duplicated or overwritten; new rows become DRAFT, UNVERIFIED records and join the research queue. Safe to re-run."
      />
      <MasterImport />
      {!r ? (
        <p className="text-sm text-charcoal-light">No import has run yet. Command line: <code>npm run import:master</code></p>
      ) : (
        <>
          <div className="card-surface grid gap-3 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs uppercase text-charcoal-light">Workbook rows covered</p><p className="text-2xl font-bold">{r.totals.workbook_rows_covered} / {r.totals.workbook_rows}</p></div>
            <div><p className="text-xs uppercase text-charcoal-light">Created from workbook</p><p className="text-2xl font-bold">{r.totals.created_from_workbook}</p></div>
            <div><p className="text-xs uppercase text-charcoal-light">Existing records linked</p><p className="text-2xl font-bold">{r.totals.existing_records_linked}</p></div>
            <div><p className="text-xs uppercase text-charcoal-light">Unverified · published</p><p className="text-2xl font-bold">{r.totals.unverified} · {r.totals.published}</p></div>
            <p className="text-xs text-charcoal-light sm:col-span-2 lg:col-span-4">
              Last run {r.generated_at.slice(0, 16).replace("T", " ")}: {r.counts.created} created, {r.counts.linked_existing} linked, {r.counts.already_imported} already imported, {r.counts.held_for_review} held for review, {r.counts.invalid} invalid, {r.counts.failures} failures. Circuits: {r.clusters.total} ({r.clusters.with_all_stops_resolved} fully linked, {r.clusters.unresolved_stops} stops without a page). Empty workbook columns: {Object.entries(r.workbook.filled_columns).filter(([, n]) => n === 0).map(([c]) => c).join(", ") || "none"}.
            </p>
          </div>

          {r.conflicts.length > 0 && (
            <section className="card-surface p-5">
              <h2 className="font-display text-lg font-semibold">Linked with a difference to check ({r.conflicts.length})</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {r.conflicts.map((c) => (
                  <li key={c.source_id}>{c.source_id} {c.name} → {c.target_id && <Link href={`${base}/destinations/${c.target_id}`} className="text-forest-700 underline">{c.target_id}</Link>}: {c.conflicts.join("; ")}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card-surface overflow-x-auto p-5">
            <h2 className="font-display text-lg font-semibold">Coverage by state / UT</h2>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-xs uppercase text-charcoal-light"><th className="px-2 py-1 text-left">State / UT</th><th className={cell}>Workbook rows</th><th className={cell}>Created</th><th className={cell}>Linked</th><th className={cell}>On site</th><th className={cell}>Published</th><th className={cell}>With coordinates</th></tr></thead>
              <tbody>
                {r.states.map((s) => (
                  <tr key={s.state} className="border-t border-forest-100"><td className="px-2 py-1">{s.state}</td><td className={cell}>{s.in_workbook}</td><td className={cell}>{s.created}</td><td className={cell}>{s.linked}</td><td className={cell}>{s.site_total}</td><td className={cell}>{s.published}</td><td className={cell}>{s.with_coordinates}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          {r.clusters.unresolved.length > 0 && (
            <section className="card-surface p-5">
              <h2 className="font-display text-lg font-semibold">Circuit stops without a destination page ({r.clusters.unresolved.length})</h2>
              <p className="text-xs text-charcoal-light">Themes (“beaches”, “Tiger circuit”) and places not in the Destinations sheet. Add a destination to link it on the next run.</p>
              <ul className="mt-2 columns-1 text-sm sm:columns-2 lg:columns-3">
                {r.clusters.unresolved.map((u, i) => <li key={i}>{u.stop} <span className="text-charcoal-light">— {u.cluster} ({u.state})</span></li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
