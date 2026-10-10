"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Hamburger button at the far left of the header with the main navigation in a drop-down. */
export function NavMenu({ links, label }: { links: Array<{ href: string; label: string }>; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-forest-800 shadow-md ring-1 ring-black/5 backdrop-blur transition hover:bg-white"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {open && (
        <ul role="menu" className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl bg-white py-2 shadow-xl ring-1 ring-black/5">
          {links.map((l) => (
            <li key={l.href} role="none">
              <Link role="menuitem" href={l.href} className={`block px-5 py-2.5 text-sm font-semibold hover:bg-forest-50 ${pathname === l.href ? "text-saffron-700" : "text-charcoal"}`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
