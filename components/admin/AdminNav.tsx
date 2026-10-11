"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface AdminNavGroup {
  heading: string;
  links: Array<{ href: string; label: string; emphasis?: boolean }>;
}

/**
 * Admin navigation. From the `lg` breakpoint it is the usual fixed side card; on phones and tablets it
 * collapses into a bar showing the current section with a button that opens the full menu.
 */
export function AdminNav({ groups, title }: { groups: AdminNavGroup[]; title: string }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const all = groups.flatMap((g) => g.links);
  // The most specific link that matches the current path is the active one.
  const active = all.filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
  const link = "flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium hover:bg-forest-50 lg:min-h-0 lg:py-1.5";

  return (
    <aside className="sticky top-16 z-20 -mx-4 bg-white/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:h-fit lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
      <div className="border-b border-forest-100 py-2 lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-forest-50 px-3 text-left"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-forest-700" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />}
          </svg>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-charcoal-light">{title}</span>
            <span className="block truncate text-sm font-semibold text-forest-800">{active?.label ?? "Menu"}</span>
          </span>
          <span aria-hidden="true" className={`text-charcoal-light transition ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
      </div>

      <nav id="admin-menu" aria-label="Admin sections" className={`${open ? "block" : "hidden"} card-surface my-3 max-h-[calc(100vh-11rem)] overflow-y-auto p-3 lg:mt-0 lg:block lg:max-h-none lg:overflow-visible lg:p-4`}>
        <p className="hidden px-2 pb-3 font-display text-lg font-bold text-forest-700 lg:block">{title}</p>
        <div className="flex flex-col gap-0.5">
          {groups.map((g) => (
            <div key={g.heading} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-charcoal-light first:pt-1">{g.heading}</p>
              {g.links.map((l) => (
                <Link key={l.href} href={l.href} aria-current={active?.href === l.href ? "page" : undefined} className={`${link} ${active?.href === l.href ? "bg-forest-100 text-forest-800" : l.emphasis ? "font-semibold text-forest-700" : "text-charcoal"}`}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
