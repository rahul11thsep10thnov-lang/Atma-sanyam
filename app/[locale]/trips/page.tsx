import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { safeSession } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinationBySlug, getDb, majorDestinations } from "@/lib/master/repo";
import { suggestFor } from "@/lib/master/routeView";
import { SignInButton } from "@/components/auth/AuthButton";
import { RouteCard } from "@/components/plan/RouteCard";

export const metadata: Metadata = {
  title: "Trip routes and planner",
  description: "Ready-made multi-city routes and a route finder based on real distances and travel times between destinations."
};

export default async function TripsPage({ params, searchParams }: { params: { locale: string }; searchParams: { from?: string; days?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const t = dict.destination.pages;
  const ui = dict.common.ui;
  const session = await safeSession();
  const providersConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
  const db = getDb();

  const start = searchParams.from ? destinationBySlug(searchParams.from) : undefined;
  const days = Math.min(21, Math.max(1, Number(searchParams.days) || 3));
  const routes = start ? suggestFor(start.id, days) : [];
  const nameOf = (id: string) => db.destinations.find((d) => d.id === id)?.name ?? id;
  const field = "mt-1 rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm text-charcoal";

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-charcoal">{t.allCircuits}</h1>
      <p className="mt-1 max-w-3xl text-sm text-charcoal-light">{t.tripsIntro}</p>

      <section className="mt-8" aria-labelledby="route-finder">
        <h2 id="route-finder" className="section-heading">{t.planRoute}</h2>
        <form method="get" className="card-surface mt-4 flex flex-wrap items-end gap-4 p-5">
          <label className="block text-sm font-medium text-charcoal">
            {t.startAt}
            <select name="from" defaultValue={start?.slug ?? ""} className={`${field} block`} required>
              <option value="" disabled>—</option>
              {majorDestinations().sort((a, b) => a.name.localeCompare(b.name)).map((d) => (<option key={d.id} value={d.slug}>{d.name}</option>))}
            </select>
          </label>
          <label className="block text-sm font-medium text-charcoal">
            {t.days}
            <input name="days" type="number" min={1} max={21} defaultValue={days} className={`${field} block w-24`} />
          </label>
          <button type="submit" className="rounded-full bg-forest-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-700">{ui.find}</button>
        </form>

        {start && (
          <div className="mt-6" aria-live="polite">
            <h3 className="font-display text-lg font-semibold text-charcoal">{t.routesFor.replace("{name}", start.name).replace("{days}", String(days))}</h3>
            {routes.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal-light">{t.noRoutes}</p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {routes.map((r) => (<RouteCard key={r.href} route={r} locale={locale} dict={dict} />))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="section-heading">{t.allCircuits}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {db.circuits.map((c) => {
            const stops = db.circuit_destinations.filter((cd) => cd.circuit_id === c.id).sort((a, b) => a.sequence_number - b.sequence_number);
            return (
              <li key={c.id}>
                <Link href={`/${locale}/trips/${c.slug}`} className="block h-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg">
                  <h3 className="font-display text-base font-semibold text-charcoal">{c.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-charcoal-light">{c.description}</p>
                  <p className="mt-2 text-xs text-forest-700">{stops.map((s) => nameOf(s.destination_id)).join(" → ")}</p>
                  <p className="mt-1 text-xs font-medium text-saffron-700">{c.minimum_days}–{c.maximum_days} {dict.home.routes.daysLabel}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="my-trips">
        <h2 id="my-trips" className="section-heading">{dict.common.nav.myTrips}</h2>
        {!session?.user && (
          <div className="card-surface mt-4 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-charcoal-light">
              {providersConfigured ? t.signInToSave : "Authentication is not configured yet — see .env.example. Routes and itineraries above work without signing in."}
            </p>
            {providersConfigured && <SignInButton label={dict.common.nav.signIn} />}
          </div>
        )}
      </section>
    </div>
  );
}
