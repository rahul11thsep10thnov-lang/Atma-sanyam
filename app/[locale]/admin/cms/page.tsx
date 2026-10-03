import type { Metadata } from "next";
import Link from "next/link";
import { dashboardCounts } from "@/lib/cms/admin";
import { overview } from "@/lib/cms/pipeline/runner";
import { StageBadge, StatusBadge } from "@/components/admin/cms/ui";
import { fmtDate } from "@/components/admin/cms/shared";

export const metadata: Metadata = { title: "Admin — Content" };
export const dynamic = "force-dynamic";

export default function CmsDashboardPage({ params }: { params: { locale: string } }) {
  const c = dashboardCounts();
  const p = overview();
  const base = `/${params.locale}/admin/cms`;
  const cards: Array<[string, number, string?]> = [
    ["Total destinations", c.total, `${base}/destinations`],
    ["Published", c.published, `${base}/destinations?status=PUBLISHED`],
    ["Draft", c.draft, `${base}/destinations?status=DRAFT`],
    ["In review", c.in_review],
    ["Pending approval", c.pending_approval, `${base}/pipeline`],
    ["Incomplete content", c.incomplete, `${base}/destinations?flag=incomplete`],
    ["Missing hero photo", c.missing_images, `${base}/destinations?flag=no_photo`],
    ["Attractions awaiting image approval", c.attractions_pending_images, `${base}/destinations?flag=pending_images`],
    ["Attractions", c.attractions],
    ["Hotel records", c.hotels],
    ["Restaurant records", c.restaurants],
    ["Archived", c.archived]
  ];
  const quick = [
    { href: `${base}/destinations`, title: "Destinations", text: "Search, filter, sort, bulk edit, publish and unpublish." },
    { href: `${base}/destinations/new`, title: "New destination", text: "Create an empty draft and fill it by hand." },
    { href: `${base}/import`, title: "Import from PDF", text: "Extract destination names from a PDF and queue them." },
    { href: `${base}/pipeline`, title: "Pipeline", text: `${p.completed}/${p.total} processed · ${p.needs_review} waiting for you.` },
    { href: `${base}/settings`, title: "Settings", text: "Site name, SEO defaults, API keys, image sources." }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal">Content</h1>
        <p className="mt-1 max-w-3xl text-sm text-charcoal-light">Every destination page is one editable record. Changes made here appear on the public page on its next request — no deploy, no code change.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(([l, v, href]) => {
          const inner = <><p className="font-display text-2xl font-bold text-forest-700">{v}</p><p className="text-xs text-charcoal-light">{l}</p></>;
          return href ? <Link key={l} href={href} className="card-surface block p-4 hover:bg-forest-50">{inner}</Link> : <div key={l} className="card-surface p-4">{inner}</div>;
        })}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quick.map((q) => (
          <li key={q.href}><Link href={q.href} className="card-surface block h-full p-4 hover:bg-forest-50"><span className="font-medium text-charcoal">{q.title}</span><span className="mt-1 block text-xs text-charcoal-light">{q.text}</span></Link></li>
        ))}
      </ul>
      <section>
        <h2 className="font-display text-lg font-semibold text-forest-700">Recently updated</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-forest-100 bg-white">
          <table className="min-w-full divide-y divide-forest-100 text-sm">
            <thead className="bg-forest-50 text-left text-xs font-semibold uppercase tracking-wide text-forest-700"><tr><th className="px-3 py-2">Destination</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Pipeline</th><th className="px-3 py-2">Attractions</th><th className="px-3 py-2">Updated</th></tr></thead>
            <tbody className="divide-y divide-forest-100">
              {c.recent.map((r) => (
                <tr key={r.id}><td className="px-3 py-2"><Link href={`${base}/destinations/${r.id}`} className="font-medium text-charcoal hover:text-forest-700">{r.name}</Link></td><td className="px-3 py-2 text-charcoal-light">{r.state ?? "—"}</td><td className="px-3 py-2"><StatusBadge status={r.status} /></td><td className="px-3 py-2"><StageBadge stage={r.stage} /></td><td className="px-3 py-2 text-charcoal-light">{r.attractions}</td><td className="px-3 py-2 text-xs text-charcoal-light">{fmtDate(r.updated_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
