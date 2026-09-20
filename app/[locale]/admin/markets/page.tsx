import type { Metadata } from "next";
import { destinations } from "@/lib/data/destinations";
import { AdminTable } from "@/components/admin/AdminTable";

export const metadata: Metadata = { title: "Admin — Markets" };

export default function AdminMarketsPage() {
  const rows = destinations.flatMap((d) => d.markets.map((m) => ({ ...m, destinationName: d.name })));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Markets ({rows.length})</h1>
      <div className="mt-4">
        <AdminTable
          rows={rows}
          columns={[
            { header: "Name", render: (r) => r.name },
            { header: "Destination", render: (r) => r.destinationName },
            { header: "Famous for", render: (r) => r.famousProducts.join(", ") }
          ]}
        />
      </div>
    </div>
  );
}
