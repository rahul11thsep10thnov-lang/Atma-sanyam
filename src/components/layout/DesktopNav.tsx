"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const DESKTOP_NAV = [
  { label: "Home", href: "/" },
  { label: "Exams", href: "/exams" },
  { label: "Mock Tests", href: "/mock-test" },
  { label: "PYQs", href: "/pyq" },
  { label: "Current Affairs", href: "/current-affairs" },
  { label: "Notes", href: "/study-notes" },
];

/** Home | Exams | Mock Tests | PYQs | Current Affairs | Notes — md and up. */
export default function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-0.5 lg:gap-1">
        {DESKTOP_NAV.map((item, i) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex items-center">
              {i > 0 && <span className="mx-1 text-slate-300" aria-hidden>|</span>}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 font-display text-[15px] font-semibold transition-colors lg:text-base",
                  active ? "heading-grad" : "text-brand-dark hover:bg-slate-100"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
