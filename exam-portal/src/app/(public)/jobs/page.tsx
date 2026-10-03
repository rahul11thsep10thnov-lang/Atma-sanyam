import type { Metadata } from "next";
import { listPublishedJobs } from "@/lib/services/jobs";
import { NoticeList } from "@/components/NoticeList";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { qualificationByCode } from "@/lib/qualifications";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Latest Government Jobs",
  description: "All government job notifications, newest first — search by state, minimum qualification and exam name.",
  alternates: { canonical: "/jobs" },
};

export default async function JobsIndexPage({ searchParams }: { searchParams: Promise<{ page?: string; state?: string; qualification?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = { stateSlug: sp.state || undefined, qualification: sp.qualification || undefined, q: sp.q?.trim() || undefined };
  const { jobs, total, pageSize } = await listPublishedJobs(page, filter);
  const state = filter.stateSlug ? await prisma.state.findUnique({ where: { slug: filter.stateSlug }, select: { name: true } }) : null;
  const qual = qualificationByCode(filter.qualification);
  const chips = [state?.name, qual?.label, filter.q ? `“${filter.q}”` : null].filter(Boolean);
  const qs = new URLSearchParams(Object.entries({ state: sp.state, qualification: sp.qualification, q: sp.q }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <main className="flex w-full flex-col gap-4 px-4 pb-10 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs" }]} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{chips.length ? "Job search results" : "Latest Government Jobs"}</h1>
        <p className="text-sm text-slate-600">{total} job{total === 1 ? "" : "s"}{chips.length ? ` · ${chips.join(" · ")}` : ""} · newest first</p>
      </div>
      <NoticeList
        empty={chips.length ? "No jobs match these filters yet. Try fewer filters." : "No job notifications published yet."}
        items={jobs.map((j) => ({ href: `/jobs/${j.slug}`, title: j.title, subtitle: [j.organizationName, j.vacancies ? `${j.vacancies.toLocaleString("en-IN")} posts` : null].filter(Boolean).join(" · "), date: j.publishedAt, deadline: j.applicationEndDate }))}
      />
      <Pagination page={page} pageSize={pageSize} total={total} basePath={qs ? `/jobs?${qs}` : "/jobs"} />
    </main>
  );
}
