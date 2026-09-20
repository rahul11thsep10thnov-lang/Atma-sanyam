import type { Metadata } from "next";
import { destinations, getPopularDestinations } from "@/lib/data/destinations";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default function AdminDashboardPage() {
  const totalAttractions = destinations.reduce((sum, d) => sum + d.attractions.length, 0);
  const totalHotels = destinations.reduce((sum, d) => sum + d.hotels.length, 0);
  const totalRestaurants = destinations.reduce((sum, d) => sum + d.restaurants.length, 0);
  const totalMarkets = destinations.reduce((sum, d) => sum + d.markets.length, 0);

  const stats = [
    { label: "Destinations", value: destinations.length },
    { label: "Attractions", value: totalAttractions },
    { label: "Hotels", value: totalHotels },
    { label: "Restaurants", value: totalRestaurants },
    { label: "Markets", value: totalMarkets },
    { label: "Languages supported", value: 6 }
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Dashboard</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        Content counts below are computed from the live catalogue. Visitor/search/click analytics require{" "}
        <code className="rounded bg-forest-100 px-1">AnalyticsEvent</code> rows once DATABASE_URL is connected and the
        client-side tracker in <code className="rounded bg-forest-100 px-1">lib/analytics</code> is wired up — this
        panel shows zeros for those until then rather than fabricating numbers.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-4">
            <p className="font-display text-2xl font-bold text-forest-700">{s.value}</p>
            <p className="text-xs text-charcoal-light">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-4">
          <h2 className="font-display text-lg font-semibold text-forest-700">Visitors (last 30 days)</h2>
          <p className="mt-2 text-3xl font-bold text-charcoal-light">—</p>
          <p className="mt-1 text-xs text-charcoal-light">Not connected — requires analytics pipeline</p>
        </div>
        <div className="card-surface p-4">
          <h2 className="font-display text-lg font-semibold text-forest-700">Searches (last 30 days)</h2>
          <p className="mt-2 text-3xl font-bold text-charcoal-light">—</p>
          <p className="mt-1 text-xs text-charcoal-light">Not connected — requires analytics pipeline</p>
        </div>
      </div>

      <div className="mt-6 card-surface p-4">
        <h2 className="font-display text-lg font-semibold text-forest-700">Most popular destinations (by catalogue score)</h2>
        <ol className="mt-3 space-y-1 text-sm">
          {getPopularDestinations(8).map((d, i) => (
            <li key={d.slug} className="flex items-center justify-between border-b border-forest-100 py-1">
              <span>
                {i + 1}. {d.name}, {d.state}
              </span>
              <span className="text-charcoal-light">{d.popularity}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
