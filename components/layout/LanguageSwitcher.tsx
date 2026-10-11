"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { replaceLocaleInPath } from "@/lib/i18n/utils";

export function LanguageSwitcher({ currentLocale, label, variant = "dropdown" }: { currentLocale: Locale; label: string; variant?: "dropdown" | "list" }) {
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

  // Inside the phone menu: all languages visible at once, no second drop-down.
  if (variant === "list") {
    return (
      <div role="group" aria-label={label}>
        <p className="px-5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-charcoal-light">🌐 {label}</p>
        <ul className="grid grid-cols-2 gap-1 px-3 pb-2">
          {locales.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                aria-pressed={loc === currentLocale}
                onClick={() => selectLocale(loc)}
                className={`flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-sm ${loc === currentLocale ? "bg-forest-50 font-semibold text-forest-700" : "text-charcoal hover:bg-forest-50"}`}
              >
                {localeNames[loc].native}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[40px] items-center gap-1.5 rounded-full border border-forest-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-forest-700 hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-saffron-500"
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
