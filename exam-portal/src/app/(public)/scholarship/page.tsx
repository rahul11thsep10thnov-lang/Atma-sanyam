import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedScholarships } from "@/lib/services/scholarships";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Scholarships",
  description: "Latest scholarship opportunities for students.",
};

export default async function ScholarshipsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { items, total, pageSize } = await listPublishedScholarships(page);

  return (
    <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Scholarships" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Scholarships</h1>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/scholarship/${item.slug}`}
              className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-600"
            >
              <h3 className="text-sm font-medium text-slate-900">{item.title}</h3>
              {item.organization ? (
                <p className="text-xs text-slate-500">{item.organization.name}</p>
              ) : null}
              {item.amount ? (
                <p className="text-xs text-slate-600">{item.amount}</p>
              ) : null}
              {item.applicationEndDate ? (
                <p className="mt-1 text-xs font-medium text-brand-700">
                  Apply by {formatDate(item.applicationEndDate)}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState message="No scholarships published yet." />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} basePath="/scholarship" />
    </main>
  );
}
