import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SignInButton, SignOutButton } from "@/components/auth/AuthButton";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const { nav, ui } = dict.common;
  const session = await getServerSession(authOptions);

  const providersConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);

  const tabs = [
    { label: nav.myTrips, description: "Trips you plan and save appear here." },
    { label: nav.savedPlaces, description: "Destinations, hotels and restaurants you've saved." },
    { label: nav.wishlists, description: "Custom wishlists you create across TripToe." },
    { label: nav.reviews, description: "Reviews you've written for places you've visited." }
  ];

  return (
    <div className="container-page py-10">
      <div className="card-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">{nav.profile}</h1>
          {session?.user ? (
            <p className="mt-1 text-sm text-charcoal-light">
              Signed in as <strong>{session.user.email ?? session.user.name}</strong>
            </p>
          ) : (
            <p className="mt-1 text-sm text-charcoal-light">
              {providersConfigured
                ? "Sign in to save trips, wishlists and write reviews."
                : "Authentication is not yet configured in this environment — set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (see .env.example) to enable sign-in."}
            </p>
          )}
        </div>
        {session?.user ? (
          <SignOutButton label={nav.signIn === "Sign In" ? "Sign out" : nav.signIn} />
        ) : (
          providersConfigured && <SignInButton label={nav.signIn} />
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {tabs.map((tab) => (
          <div key={tab.label} className="card-surface p-5">
            <h2 className="font-display text-lg font-semibold text-forest-700">{tab.label}</h2>
            <p className="mt-1 text-sm text-charcoal-light">{tab.description}</p>
            <p className="mt-3 rounded-lg bg-forest-50 px-3 py-2 text-xs text-charcoal-light">
              {session?.user ? "No items yet." : `${ui.sampleData} — sign in to get started.`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
