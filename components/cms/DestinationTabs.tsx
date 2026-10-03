"use client";

import { useEffect, useState } from "react";

/**
 * Sticky tab bar for the destination page. The five tabs scroll to their
 * section; an IntersectionObserver highlights whichever section is in view.
 * Horizontally scrollable on phones; each tab is a real link so it works
 * without JavaScript and with a keyboard.
 */
export function DestinationTabs({ tabs }: { tabs: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter((x): x is HTMLElement => Boolean(x));
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: [0, 0.2] }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <nav aria-label="Destination sections" className="sticky top-16 z-20 border-b border-forest-100 bg-offwhite/95 backdrop-blur supports-[backdrop-filter]:bg-offwhite/85">
      <ul className="container-page -mb-px flex gap-1 overflow-x-auto py-2 sm:gap-2" role="tablist">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <li key={t.id} className="shrink-0">
              <a
                href={`#${t.id}`}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActive(t.id)}
                className={`inline-block rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${isActive ? "bg-forest-600 text-white shadow-sm" : "text-charcoal-light hover:bg-forest-50 hover:text-forest-700"}`}
              >
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
