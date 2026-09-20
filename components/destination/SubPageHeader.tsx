import Link from "next/link";
import type { Destination } from "@/lib/types";

export function SubPageHeader({
  destination,
  locale,
  title,
  subtitle
}: {
  destination: Destination;
  locale: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-forest-100 bg-forest-50/60 py-8">
      <div className="container-page">
        <Link
          href={`/${locale}/india/${destination.stateSlug}/${destination.slug}`}
          className="text-sm font-medium text-forest-600 hover:underline"
        >
          ← {destination.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-charcoal sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-charcoal-light">{subtitle}</p>}
      </div>
    </div>
  );
}
