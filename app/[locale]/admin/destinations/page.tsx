import Link from "next/link";
import type { Metadata } from "next";
import { destinations } from "@/lib/data/destinations";
import { AdminTable } from "@/components/admin/AdminTable";

export const metadata: Metadata = { title: "Admin — Destinations" };

export default function AdminDestinationsPage({ params }: { params: { locale: string } }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-charcoal">Destinations ({destinations.length})</h1>
        <Link
          href={`/${params.locale}/admin/destinations/new`}
          className="rounded-full bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
        >
          + Add destination
        </Link>
      </div>

      <div className="mt-4">
        <AdminTable
          rows={destinations}
          columns={[
            { header: "Name", render: (d) => d.name },
            { header: "State", render: (d) => d.state },
            { header: "Attractions", render: (d) => d.attractions.length },
            { header: "Hotels", render: (d) => d.hotels.length },
            { header: "Sample data?", render: (d) => (d.isSampleData ? "Yes" : "No") }
          ]}
        />
      </div>
    </div>
  );
}
