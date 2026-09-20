"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function MobileBottomNav({ locale, labels }: { locale: Locale; labels: Record<"home" | "explore" | "search" | "trips" | "profile", string> }) {
  const pathname = usePathname() ?? "/";

  const items: NavItem[] = [
    { href: `/${locale}`, label: labels.home, icon: "🏠" },
    { href: `/${locale}/explore`, label: labels.explore, icon: "🧭" },
    { href: `/${locale}/search`, label: labels.search, icon: "🔍" },
    { href: `/${locale}/trips`, label: labels.trips, icon: "🧳" },
    { href: `/${locale}/profile`, label: labels.profile, icon: "👤" }
  ];

  return (
    <nav
      aria-label={labels.explore}
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-forest-100 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = item.href === `/${locale}` ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active ? "text-forest-600" : "text-charcoal-light"
            }`}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
