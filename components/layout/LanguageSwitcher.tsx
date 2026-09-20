"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { replaceLocaleInPath } from "@/lib/i18n/utils";

export function LanguageSwitcher({ currentLocale, label }: { currentLocale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectLocale(next: Locale) {
    setOpen(false);
    if (next === currentLocale) return;
    const nextPath = replaceLocaleInPath(pathname ?? "/", next);
    router.push(nextPath);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-forest-200 px-3 py-1.5 text-sm font-medium text-forest-700 hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-saffron-500"
      >
        <span aria-hidden="true">🌐</span>
        <span>{localeNames[currentLocale].native}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-forest-100 bg-white py-1 shadow-lg"
        >
          {locales.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                role="option"
                aria-selected={loc === currentLocale}
                onClick={() => selectLocale(loc)}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-forest-50 ${
                  loc === currentLocale ? "font-semibold text-forest-700" : "text-charcoal"
                }`}
              >
                <span>{localeNames[loc].native}</span>
                <span className="text-xs text-charcoal-light">{localeNames[loc].english}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
