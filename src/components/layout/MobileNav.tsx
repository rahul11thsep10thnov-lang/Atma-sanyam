"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, GraduationCap, PenSquare, Timer, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Exams", href: "/exams", icon: GraduationCap },
  { label: "Practice", href: "/practice", icon: PenSquare },
  { label: "Mock", href: "/mock-test", icon: Timer },
  { label: "More", href: "/more", icon: Menu },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--card-border)] bg-white md:hidden">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-brand-navy" : "text-gray-500"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
