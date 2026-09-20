import type { Metadata } from "next";
import { destinations } from "@/lib/data/destinations";
import { AdminTable } from "@/components/admin/AdminTable";

export const metadata: Metadata = { title: "Admin — Hotels" };

export default function AdminHotelsPage() {
  const rows = destinations.flatMap((d) => d.hotels.map((h) => ({ ...h, destinationName: d.name })));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Hotels ({rows.length})</h1>
      <div className="mt-4">
        <AdminTable
          rows={rows}
          columns={[
            { header: "Name", render: (r) => r.name },
            { header: "Destination", render: (r) => r.destinationName },
            { header: "Category", render: (r) => r.category },
            { header: "Verified data?", render: (r) => (r.dataVerified ? "Yes" : "No") }
          ]}
        />
      </div>
    </div>
  );
}
