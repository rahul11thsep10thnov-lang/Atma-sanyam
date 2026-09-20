"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { destinationSummaries, popularSearchSlugs } from "@/lib/data/destinations";

export function Hero({
  locale,
  headline,
  subheading,
  placeholder,
  searchExamples,
  popularSearchesLabel
}: {
  locale: string;
  headline: string;
  subheading: string;
  placeholder: string;
  searchExamples: string;
  popularSearchesLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const matches =
    query.trim().length > 0
      ? destinationSummaries
          .filter(
            (d) =>
              d.name.toLowerCase().includes(query.toLowerCase()) ||
              d.state.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6)
      : [];

  const popularSearches = popularSearchSlugs
    .map((slug) => destinationSummaries.find((d) => d.slug === slug))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  function goTo(slug: string, stateSlug: string) {
    setOpen(false);
    router.push(`/${locale}/india/${stateSlug}/${slug}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (matches[0]) goTo(matches[0].slug, matches[0].stateSlug);
  }

  return (
    <section className="relative overflow-hidden bg-forest-700 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-diya-pattern opacity-40"
        style={{ backgroundSize: "22px 22px" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-forest-900/60 via-forest-700/70 to-forest-800"
      />
      <div className="container-page relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">{headline}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-forest-50/90 sm:text-lg">{subheading}</p>

          <form onSubmit={onSubmit} className="relative mx-auto mt-8 max-w-xl">
            <label htmlFor="hero-search" className="sr-only">
              {placeholder}
            </label>
            <input
              id="hero-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={placeholder}
              className="w-full rounded-full border-0 px-6 py-4 text-base text-charcoal shadow-lg placeholder:text-charcoal-light/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-saffron-400"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600"
            >
              Search
            </button>
            {open && matches.length > 0 && (
              <ul className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl bg-white text-left shadow-xl">
                {matches.map((m) => (
                  <li key={m.slug}>
                    <button
                      type="button"
                      onMouseDown={() => goTo(m.slug, m.stateSlug)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-forest-50"
                    >
                      <span className="font-medium text-charcoal">{m.name}</span>
                      <span className="text-xs text-charcoal-light">{m.state}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          <p className="mt-2 text-xs text-forest-100/80">{searchExamples}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-forest-100/80">
              {popularSearchesLabel}:
            </span>
            {popularSearches.map((d) => (
              <Link
                key={d.slug}
                href={`/${locale}/india/${d.stateSlug}/${d.slug}`}
                className="rounded-full border border-white/30 px-3 py-1 text-sm text-white hover:bg-white/10"
              >
                {d.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
