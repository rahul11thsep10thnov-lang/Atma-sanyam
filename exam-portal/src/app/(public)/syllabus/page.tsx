import type { Metadata } from "next";
import { listPublishedSyllabi } from "@/lib/services/syllabi";
import { NoticeList } from "@/components/NoticeList";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Syllabus", description: "Exam syllabi, newest first.", alternates: { canonical: "/syllabus" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const data = await listPublishedSyllabi(page);
  const rows = data.syllabi;
  return (
    <main className="flex w-full flex-col gap-4 px-4 pb-10 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Syllabus" }]} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Syllabus</h1>
        <p className="text-sm text-slate-600">{data.total} · newest first</p>
      </div>
      <NoticeList empty="No syllabi published yet." items={rows.map((r) => ({ href: `/syllabus/${r.slug}`, title: r.title, subtitle: r.examTitle, date: null, dateLabel: "" }))} />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} basePath="/syllabus" />
    </main>
  );
}
