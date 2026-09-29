import type { Metadata } from "next";
import { listPublishedAnswerKeys } from "@/lib/services/answerKeys";
import { AnswerKeyCard } from "@/components/cards/AnswerKeyCard";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Latest Answer Keys",
  description: "Official answer keys and objection information for the latest government exams.",
};

export default async function AnswerKeysIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { answerKeys, total, pageSize } = await listPublishedAnswerKeys(page);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Answer Keys" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        Latest Answer Keys
      </h1>

      {answerKeys.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {answerKeys.map((answerKey) => (
            <AnswerKeyCard key={answerKey.slug} answerKey={answerKey} />
          ))}
        </div>
      ) : (
        <EmptyState message="No answer keys published yet." />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} basePath="/answer-key" />
    </main>
  );
}
