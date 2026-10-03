import type { Metadata } from "next";
import { listPublishedAdmissions } from "@/lib/services/admissions";
import { NoticeList } from "@/components/NoticeList";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Admissions", description: "Admission notifications, newest first.", alternates: { canonical: "/admission" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const data = await listPublishedAdmissions(page);
  const rows = data.items;
  return (
    <main className="flex w-full flex-col gap-4 px-4 pb-10 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admissions" }]} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Admissions</h1>
        <p className="text-sm text-slate-600">{data.total} · newest first</p>
      </div>
      <NoticeList empty="No admissions published yet." items={rows.map((r) => ({ href: `/admission/${r.slug}`, title: r.title, subtitle: r.organization?.name, date: null, dateLabel: "" }))} />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} basePath="/admission" />
    </main>
  );
}
