import type { Metadata } from "next";
import { listPublishedResults } from "@/lib/services/results";
import { ResultCard } from "@/components/cards/ResultCard";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Latest Results",
  description: "Browse the latest government exam results.",
};

export default async function ResultsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { results, total, pageSize } = await listPublishedResults(page);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Results" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        Latest Results
      </h1>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <ResultCard key={result.slug} result={result} />
          ))}
        </div>
      ) : (
        <EmptyState message="No results published yet." />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} basePath="/results" />
    </main>
  );
}
