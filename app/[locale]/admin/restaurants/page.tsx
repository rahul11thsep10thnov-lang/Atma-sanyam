import type { Metadata } from "next";
import { destinations } from "@/lib/data/destinations";
import { AdminTable } from "@/components/admin/AdminTable";

export const metadata: Metadata = { title: "Admin — Restaurants" };

export default function AdminRestaurantsPage() {
  const rows = destinations.flatMap((d) => d.restaurants.map((r) => ({ ...r, destinationName: d.name })));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Restaurants ({rows.length})</h1>
      <div className="mt-4">
        <AdminTable
          rows={rows}
          columns={[
            { header: "Name", render: (r) => r.name },
            { header: "Destination", render: (r) => r.destinationName },
            { header: "Categories", render: (r) => r.categories.join(", ") },
            { header: "Veg/Non-veg", render: (r) => r.vegNonVeg }
          ]}
        />
      </div>
    </div>
  );
}
