"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import type { SuggestionItem } from "@/lib/master/view";

/**
 * Large centred search with a listbox of suggestions (destinations, attractions,
 * states). Keyboard: ↑/↓ move, Enter opens, Esc closes. A typed place name
 * goes straight to its page; free text goes to intent-aware search.
 */
export function HeroSearch({ locale, placeholder, suggestions, buttonLabel }: { locale: string; placeholder: string; suggestions: SuggestionItem[]; buttonLabel: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? suggestions
        .map((s) => ({ s, score: s.label.toLowerCase().startsWith(q) ? 3 : s.label.toLowerCase().includes(q) ? 2 : s.sublabel.toLowerCase().includes(q) ? 1 : 0 }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((x) => x.s)
    : [];

  function go(href: string) {
    setOpen(false);
    router.push(`/${locale}${href}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = cursor >= 0 ? matches[cursor] : matches.find((m) => m.label.toLowerCase() === q);
    if (chosen) go(chosen.href);
    else if (q) router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !matches.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (c + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (c <= 0 ? matches.length - 1 : c - 1)); }
    else if (e.key === "Escape") { setOpen(false); setCursor(-1); }
  }

  return (
    <form onSubmit={submit} role="search" className="relative mx-auto mt-8 w-full max-w-2xl">
      <label htmlFor="hero-search" className="sr-only">{placeholder}</label>
      <div className="flex items-center rounded-full bg-white p-1.5 shadow-[0_12px_40px_-10px_rgba(31,59,50,0.45)] ring-2 ring-forest-600/80 focus-within:ring-saffron-500">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-4 h-6 w-6 shrink-0 text-forest-600"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        <input
          ref={inputRef}
          id="hero-search"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={cursor >= 0 ? `${listId}-${cursor}` : undefined}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3.5 text-base text-charcoal placeholder:text-charcoal-light/70 focus:outline-none sm:text-lg"
        />
        <button type="submit" className="shrink-0 rounded-full bg-forest-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-forest-700 sm:px-6">{buttonLabel}</button>
      </div>
      {open && matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl bg-white text-left shadow-xl ring-1 ring-black/5">
          {matches.map((m, i) => (
            <li key={m.href} id={`${listId}-${i}`} role="option" aria-selected={i === cursor}>
              <button type="button" onMouseDown={() => go(m.href)} onMouseEnter={() => setCursor(i)} className={`flex w-full items-center justify-between px-5 py-3 text-left ${i === cursor ? "bg-forest-50" : "hover:bg-forest-50"}`}>
                <span className="font-medium text-charcoal">{m.label}</span>
                <span className="ml-3 shrink-0 text-xs text-charcoal-light">{m.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
