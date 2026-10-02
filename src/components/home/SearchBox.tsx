import { Search } from "lucide-react";

/** Prominent site search. Plain GET form, so it works before hydration. */
export default function SearchBox({ className = "", autoFocus = false, defaultValue = "" }: { className?: string; autoFocus?: boolean; defaultValue?: string }) {
  return (
    <form action="/search" method="get" role="search" className={`relative ${className}`}>
      <label htmlFor="site-search" className="sr-only">
        Search an exam, subject, question or state
      </label>
      <Search size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        id="site-search"
        name="q"
        type="search"
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        autoComplete="off"
        placeholder="🔍 Search an exam, subject, question or state"
        className="w-full rounded-2xl border-2 border-[var(--card-border)] bg-white py-4 pl-12 pr-28 text-[17px] text-brand-dark shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-coral focus:shadow-md"
      />
      <button type="submit" className="btn-cta absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 text-[15px]">
        Search
      </button>
    </form>
  );
}
