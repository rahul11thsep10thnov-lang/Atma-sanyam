import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";

const NAV_ITEMS = [
  { href: "", label: "Dashboard" },
  { href: "/destinations", label: "Destinations" },
  { href: "/attractions", label: "Attractions" },
  { href: "/hotels", label: "Hotels" },
  { href: "/restaurants", label: "Restaurants" },
  { href: "/markets", label: "Markets" },
  { href: "/reviews", label: "Reviews" },
  { href: "/translations", label: "Translations" },
  { href: "/users", label: "Users" },
  { href: "/seo", label: "SEO Metadata" }
];

export default function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const base = `/${locale}/admin`;

  return (
    <div className="min-h-[70vh] bg-forest-50/40">
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="card-surface h-fit p-4">
          <p className="px-2 pb-3 font-display text-lg font-bold text-forest-700">TripToe Admin</p>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={`${base}${item.href}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-charcoal hover:bg-forest-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
