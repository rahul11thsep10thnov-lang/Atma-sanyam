import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPopularDestinations } from "@/lib/data/destinations";
import { SignInButton } from "@/components/auth/AuthButton";

export const metadata: Metadata = { title: "My Trips" };

export default async function TripsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const session = await getServerSession(authOptions);
  const providersConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
  const suggestions = getPopularDestinations(4);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-charcoal">{dict.common.nav.myTrips}</h1>

      {!session?.user && (
        <div className="card-surface mt-4 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-charcoal-light">
            {providersConfigured
              ? "Sign in to start planning and saving trips."
              : "Authentication is not yet configured — see .env.example. You can still try the itinerary generator on any destination page without saving."}
          </p>
          {providersConfigured && <SignInButton label={dict.common.nav.signIn} />}
        </div>
      )}

      <div className="mt-8">
        <h2 className="section-heading">Plan a new trip</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {suggestions.map((d) => (
            <Link
              key={d.slug}
              href={`/${locale}/india/${d.stateSlug}/${d.slug}/itinerary`}
              className="card-surface p-4 text-sm font-medium text-forest-700 hover:bg-forest-50"
            >
              {dict.destination.itinerary.title} — {d.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
