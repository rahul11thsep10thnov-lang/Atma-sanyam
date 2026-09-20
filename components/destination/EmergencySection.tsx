import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function EmergencySection({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { sections, emergency } = dict.destination;
  const { ui } = dict.common;

  const national = destination.emergencyContacts.filter((c) => c.scope === "national");
  const local = destination.emergencyContacts.filter((c) => c.scope === "local");

  return (
    <WatermarkSection images={destination.watermarkImages} id="emergency" className="bg-terracotta-700 py-10 text-white">
      <div className="container-page">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{sections.emergency}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/90">{ui.verifyEmergencyNotice}</p>

        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-terracotta-100">{emergency.national}</h3>
            <ul className="mt-3 space-y-2">
              {national.map((c) => (
                <li key={c.label} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2">
                  <span className="text-sm">{c.label}</span>
                  <a href={`tel:${c.number.split(" ")[0]}`} className="font-display text-lg font-bold">
                    {c.number}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-terracotta-100">{emergency.local}</h3>
            <ul className="mt-3 space-y-2">
              {local.length === 0 && <li className="text-sm text-white/70">—</li>}
              {local.map((c) => (
                <li key={c.label} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2">
                  <span className="text-sm">{c.label}</span>
                  <span className="font-display text-base font-semibold">{c.number}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </WatermarkSection>
  );
}
