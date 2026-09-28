/**
 * Plain HTML GET form — works without client-side JavaScript (Section 25:
 * minimal JS, works on slow connections/low-end phones). Submits to
 * `/search?q=...`, handled by `src/app/(public)/search/page.tsx`.
 */
export function SearchBar({ className = "" }: { className?: string }) {
  return (
    <form action="/search" method="GET" className={`flex ${className}`}>
      <label htmlFor="search-q" className="sr-only">
        Search exams and jobs
      </label>
      <input
        id="search-q"
        type="search"
        name="q"
        placeholder="Search exams, jobs, organizations…"
        className="w-full rounded-l-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      <button
        type="submit"
        className="rounded-r-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
      >
        Search
      </button>
    </form>
  );
}
