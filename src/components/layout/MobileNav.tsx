"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Target, PenSquare, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "PYQ", href: "/pyq", icon: FileText },
  { label: "Practice", href: "/practice", icon: PenSquare },
  { label: "Mock", href: "/mock-test", icon: Target },
  { label: "More", href: "/more", icon: LayoutGrid },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--card-border)] bg-white/95 backdrop-blur pb-safe md:hidden"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-1 pt-2 pb-2.5"
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  active ? "bg-brand-orange-light text-brand-orange" : "text-slate-500"
                )}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={cn("font-display text-[11px]", active ? "font-semibold text-brand-orange" : "font-medium text-slate-500")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
