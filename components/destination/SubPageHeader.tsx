import Link from "next/link";
import type { DestinationView } from "@/lib/master/view";

export function SubPageHeader({ view, locale, title, subtitle }: { view: DestinationView; locale: string; title: string; subtitle?: string }) {
  return (
    <div className="border-b border-forest-100 bg-forest-50/60 py-8">
      <div className="container-page">
        <Link href={`/${locale}${view.path}`} className="text-sm font-medium text-forest-600 hover:underline">
          ← {view.record.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-charcoal sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-charcoal-light">{subtitle}</p>}
      </div>
    </div>
  );
}
