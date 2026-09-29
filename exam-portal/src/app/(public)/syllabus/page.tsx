import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedSyllabi } from "@/lib/services/syllabi";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Exam Syllabus",
  description: "Structured, paper-wise syllabus for the latest government exams.",
};

export default async function SyllabusIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { syllabi, total, pageSize } = await listPublishedSyllabi(page);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Syllabus" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        Exam Syllabus
      </h1>

      {syllabi.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {syllabi.map((syllabus) => (
            <Link
              key={syllabus.slug}
              href={`/syllabus/${syllabus.slug}`}
              className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-600"
            >
              <h3 className="text-sm font-medium text-slate-900">
                {syllabus.title}
              </h3>
              <p className="text-xs text-slate-500">{syllabus.examTitle}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState message="No syllabus published yet." />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} basePath="/syllabus" />
    </main>
  );
}
