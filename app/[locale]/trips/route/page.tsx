import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { attractionHrefs } from "@/lib/master/view";
import { planItinerary } from "@/lib/master/engine/itinerary";
import { TripPlanner } from "@/components/destination/TripPlanner";

export const metadata: Metadata = { title: "Custom route", robots: { index: false, follow: true } };

/** /trips/route?stops=varanasi:2,prayagraj:1 — a plan for a route picked in the route finder. Not indexed (infinite URL space). */
export default function CustomRoutePage({ params, searchParams }: { params: { locale: string }; searchParams: { stops?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const stops = (searchParams.stops ?? "")
    .split(",")
    .slice(0, 5)
    .map((part) => {
      const [slug, d] = part.split(":");
      const dest = destinationBySlug(slug ?? "");
      return dest ? { slug: dest.slug, id: dest.id, name: dest.name, days: Math.min(10, Math.max(1, Number(d) || dest.recommended_days)) } : null;
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  if (stops.length === 0) notFound();

  const plan = planItinerary(getDb(), { stops: stops.map((s) => ({ destination_id: s.id, days: s.days })), travellers: 2, tier: "MID_RANGE" });
  const hrefs = attractionHrefs(plan.activities.map((a) => a.attraction_id).filter((x): x is string => Boolean(x)));

  return (
    <>
      <header className="border-b border-forest-100 bg-forest-50/60 py-8">
        <div className="container-page">
          <Link href={`/${locale}/trips`} className="text-sm font-medium text-forest-600 hover:underline">← {dict.destination.pages.allCircuits}</Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-charcoal">{stops.map((s) => s.name).join(" → ")}</h1>
        </div>
      </header>
      <TripPlanner stops={stops.map((s) => ({ slug: s.slug, days: s.days }))} minDays={1} maxDays={10} defaultDays={stops.reduce((t, s) => t + s.days, 0)} locale={locale} dict={dict} initial={{ plan, hrefs }} />
    </>
  );
}
