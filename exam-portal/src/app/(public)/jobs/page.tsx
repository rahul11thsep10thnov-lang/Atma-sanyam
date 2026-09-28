import type { Metadata } from "next";
import { listPublishedJobs } from "@/lib/services/jobs";
import { JobCard } from "@/components/cards/JobCard";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Latest Government Jobs — Exam Portal",
  description:
    "Browse the latest government job notifications: organization, vacancies, and application deadlines.",
};

export default async function JobsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { jobs, total, pageSize } = await listPublishedJobs(page);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        Latest Government Jobs
      </h1>

      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.slug} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState message="No job notifications published yet." />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} basePath="/jobs" />
    </main>
  );
}
