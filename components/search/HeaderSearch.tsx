"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { SuggestionItem } from "@/lib/master/view";

export function HeaderSearch({ locale, placeholder, suggestions }: { locale: Locale; placeholder: string; suggestions: SuggestionItem[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const q = query.trim().toLowerCase();
  const matches = q
    ? suggestions.filter((d) => d.label.toLowerCase().includes(q) || d.sublabel.toLowerCase().includes(q)).slice(0, 6)
    : [];

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(`/${locale}${href}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (matches[0] && matches[0].label.toLowerCase() === q) goTo(matches[0].href);
    else if (q) {
      setOpen(false);
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <label htmlFor="header-search" className="sr-only">
        {placeholder}
      </label>
      <input
        id="header-search"
        type="search"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls="header-search-listbox"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className="w-full rounded-full border border-forest-200 bg-white px-4 py-1.5 text-sm text-charcoal placeholder:text-charcoal-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-saffron-500"
      />
      {open && matches.length > 0 && (
        <ul
          id="header-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-auto rounded-xl border border-forest-100 bg-white py-1 shadow-lg"
        >
          {matches.map((m) => (
            <li key={m.href}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={() => goTo(m.href)}
                className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-forest-50"
              >
                <span className="text-sm font-medium text-charcoal">{m.label}</span>
                <span className="text-xs text-charcoal-light">{m.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
