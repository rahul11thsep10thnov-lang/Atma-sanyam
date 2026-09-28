import type { Metadata } from "next";
import { searchSite } from "@/lib/services/search";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Search — Exam Portal",
  robots: { index: false, follow: true },
};

/**
 * Minimal search results page — see the comment on `searchSite` for what's
 * deliberately deferred to Phase 11 (filters, pagination, every content
 * type, not just Exam/Job).
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query.length >= 2 ? await searchSite(query) : [];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold text-slate-900">
        {query ? `Search results for "${query}"` : "Search"}
      </h1>

      {query.length > 0 && query.length < 2 ? (
        <p className="text-sm text-slate-500">
          Type at least 2 characters to search.
        </p>
      ) : null}

      {query.length >= 2 && results.length === 0 ? (
        <EmptyState message={`No published exams or jobs match "${query}".`} />
      ) : null}

      {results.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {results.map((result, index) => (
            <li
              key={`${result.type}-${index}`}
              className="rounded-md border border-slate-200 bg-white px-4 py-3"
            >
              <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {result.type}
              </span>
              <span className="text-sm font-medium text-slate-900">
                {result.title}
              </span>
              <span className="ml-2 text-xs text-slate-500">
                {result.organizationName}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
