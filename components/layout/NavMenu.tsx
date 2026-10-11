"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Hamburger button at the far left of the header with the main navigation in a drop-down. */
export function NavMenu({ links, label, phoneExtra }: { links: Array<{ href: string; label: string }>; label: string; /** Shown only on phones, below the links (language list, sign-in). */ phoneExtra?: React.ReactNode }) {
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
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white py-2 shadow-xl ring-1 ring-black/5 sm:w-auto sm:min-w-[200px]">
        <ul role="menu">
          {links.map((l) => (
            <li key={l.href} role="none">
              <Link role="menuitem" href={l.href} className={`flex min-h-[44px] items-center px-5 text-sm font-semibold hover:bg-forest-50 ${pathname === l.href ? "text-saffron-700" : "text-charcoal"}`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        {phoneExtra && <div className="mt-1 border-t border-forest-100 pt-1 sm:hidden">{phoneExtra}</div>}
        </div>
      )}
    </div>
  );
}
