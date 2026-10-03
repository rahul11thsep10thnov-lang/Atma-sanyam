import type { Metadata } from "next";
import { listPublishedAnswerKeys } from "@/lib/services/answerKeys";
import { NoticeList } from "@/components/NoticeList";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Answer Keys", description: "All answer keys, newest first.", alternates: { canonical: "/answer-key" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const data = await listPublishedAnswerKeys(page);
  const rows = data.answerKeys;
  return (
    <main className="flex w-full flex-col gap-4 px-4 pb-10 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Answer Keys" }]} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Answer Keys</h1>
        <p className="text-sm text-slate-600">{data.total} · newest first</p>
      </div>
      <NoticeList empty="No answer keys published yet." items={rows.map((r) => ({ href: `/answer-key/${r.slug}`, title: r.title, subtitle: r.examTitle, date: r.answerKeyDate, dateLabel: "Released" }))} />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} basePath="/answer-key" />
    </main>
  );
}
