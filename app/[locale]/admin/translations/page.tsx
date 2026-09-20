import type { Metadata } from "next";
import { locales, localeNames } from "@/lib/i18n/config";

export const metadata: Metadata = { title: "Admin — Translations" };

export default function AdminTranslationsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Translations</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        UI strings live in <code className="rounded bg-forest-100 px-1">/locales/&lt;lang&gt;/*.json</code>. Per-destination
        content translations are modeled by the <code className="rounded bg-forest-100 px-1">Translation</code> table
        (destinationId + locale + field) in the Prisma schema — connect DATABASE_URL to manage them here.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {locales.map((l) => (
          <div key={l} className="card-surface p-4 text-center">
            <p className="font-display text-lg font-bold text-forest-700">{localeNames[l].native}</p>
            <p className="text-xs text-charcoal-light">{localeNames[l].english}</p>
            <p className="mt-2 text-xs text-forest-600">UI: complete</p>
          </div>
        ))}
      </div>
    </div>
  );
}
