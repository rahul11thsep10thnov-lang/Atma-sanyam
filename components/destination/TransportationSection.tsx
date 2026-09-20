import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function TransportationSection({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { sections } = dict.destination;
  const t = destination.transportation;

  const rows: Array<[string, string]> = [
    ["Nearest airport", t.nearestAirport],
    ["Nearest railway station", t.nearestRailwayStation],
    ["Major bus stations", t.majorBusStations.join(", ")],
    ["Road connectivity", t.roadConnectivity],
    ["Taxi", t.taxiInfo],
    ...(t.metroInfo ? ([["Metro", t.metroInfo]] as Array<[string, string]>) : []),
    ["Local transport", t.localTransport.join(", ")],
    ["Auto-rickshaw", t.autoRickshaw],
    ["Rental vehicles", t.rentalVehicles],
    ...(t.fromDelhi ? ([["How to reach from Delhi", t.fromDelhi]] as Array<[string, string]>) : [])
  ];

  return (
    <WatermarkSection images={destination.watermarkImages} id="transportation" className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.transportation}</h2>
        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="border-b border-forest-100 pb-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
              <dd className="mt-1 text-sm text-charcoal">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </WatermarkSection>
  );
}
