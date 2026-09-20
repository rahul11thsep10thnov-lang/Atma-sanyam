import type { Metadata } from "next";
import { destinations } from "@/lib/data/destinations";
import { AdminTable } from "@/components/admin/AdminTable";

export const metadata: Metadata = { title: "Admin — SEO Metadata" };

export default function AdminSeoPage() {
  const rows = destinations.map((d) => ({
    id: d.id,
    name: d.name,
    path: `/india/${d.stateSlug}/${d.slug}`,
    titleLength: `${d.name} Travel Guide — ${d.state}`.length,
    descriptionLength: d.shortDescription.length
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">SEO metadata</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        Titles, meta descriptions, canonical URLs, hreflang alternates and Schema.org structured data are generated
        automatically per destination (see <code className="rounded bg-forest-100 px-1">generateMetadata</code> in
        each destination route and <code className="rounded bg-forest-100 px-1">components/seo</code>). This table is a
        quick health check on title/description length.
      </p>
      <div className="mt-4">
        <AdminTable
          rows={rows}
          columns={[
            { header: "Destination", render: (r) => r.name },
            { header: "Path", render: (r) => r.path },
            {
              header: "Title length",
              render: (r) => (
                <span className={r.titleLength > 60 ? "text-terracotta-600" : "text-forest-600"}>{r.titleLength}</span>
              )
            },
            {
              header: "Description length",
              render: (r) => (
                <span className={r.descriptionLength > 160 ? "text-terracotta-600" : "text-forest-600"}>
                  {r.descriptionLength}
                </span>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}
