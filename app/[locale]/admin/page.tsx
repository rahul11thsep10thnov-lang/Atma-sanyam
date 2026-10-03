import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/master/repo";
import { ADMIN_SECTIONS, dashboardStats } from "@/lib/admin/sections";
import { dashboardCounts } from "@/lib/cms/admin";

export const metadata: Metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default function AdminDashboardPage({ params }: { params: { locale: string } }) {
  const stats = dashboardStats(getDb());
  const cms = dashboardCounts();
  const base = `/${params.locale}/admin`;
  const bad = new Set(["Stale facts", "Open conflicts", "Integrity errors", "Generated pages failing fact-check"]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Dashboard</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        Counts are computed from the master database. Visitor and search analytics need an events store and are deliberately not shown as numbers until one is attached.
      </p>

      <h2 className="mt-6 font-display text-lg font-semibold text-forest-700">Content (CMS)</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([["Destinations", cms.total], ["Published", cms.published], ["Drafts", cms.draft], ["Pending approval", cms.pending_approval], ["Incomplete", cms.incomplete], ["Missing hero photo", cms.missing_images], ["Hotels", cms.hotels], ["Restaurants", cms.restaurants]] as Array<[string, number]>).map(([label, value]) => (
          <Link key={label} href={`${base}/cms`} className="card-surface block p-4 hover:bg-forest-50">
            <p className="font-display text-2xl font-bold text-forest-700">{value}</p>
            <p className="text-xs text-charcoal-light">{label}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold text-forest-700">Master database</h2>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.counts.map(([label, value]) => (
          <div key={label} className="card-surface p-4">
            <p className="font-display text-2xl font-bold text-forest-700">{value}</p>
            <p className="text-xs text-charcoal-light">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold text-forest-700">Data quality</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.quality.map(([label, value]) => (
          <div key={label} className="card-surface p-4">
            <p className={`font-display text-2xl font-bold ${bad.has(label) && value > 0 ? "text-terracotta-700" : "text-forest-700"}`}>{value}</p>
            <p className="text-xs text-charcoal-light">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold text-forest-700">Sections</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {ADMIN_SECTIONS.map((s) => (
          <li key={s.slug}>
            <Link href={`${base}/${s.slug}`} className="card-surface block h-full p-4 hover:bg-forest-50">
              <span className="font-medium text-charcoal">{s.title}</span>
              <span className="mt-1 block text-xs text-charcoal-light">{s.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
