import type { Metadata } from "next";
import { listPublishedAdmitCards } from "@/lib/services/admitCards";
import { NoticeList } from "@/components/NoticeList";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Admit Cards", description: "All admit cards, newest first.", alternates: { canonical: "/admit-card" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const data = await listPublishedAdmitCards(page);
  const rows = data.admitCards;
  return (
    <main className="flex w-full flex-col gap-4 px-4 pb-10 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admit Cards" }]} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Admit Cards</h1>
        <p className="text-sm text-slate-600">{data.total} · newest first</p>
      </div>
      <NoticeList empty="No admit cards published yet." items={rows.map((r) => ({ href: `/admit-card/${r.slug}`, title: r.title, subtitle: r.examTitle, date: r.examDate, dateLabel: "Exam" }))} />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} basePath="/admit-card" />
    </main>
  );
}
