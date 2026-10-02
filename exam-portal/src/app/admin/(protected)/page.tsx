import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [examCount, jobCount, inReviewCount, adminCount, noticeInbox, noticeReview, recruitments, failed] = await Promise.all([
    prisma.exam.count(),
    prisma.job.count(),
    prisma.exam.count({ where: { status: "IN_REVIEW" } }),
    prisma.adminUser.count(),
    prisma.recruitmentNotice.count({ where: { status: { in: ["NEW", "NEEDS_REVIEW", "AUTO_APPROVED", "APPROVED"] } } }),
    prisma.recruitmentNotice.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.recruitment.count(),
    prisma.pipelineError.count({ where: { resolvedAt: null } }),
  ]);

  const stats = [
    { label: "Automation inbox", value: noticeInbox, href: "/admin/automation/inbox" },
    { label: "Notices needing review", value: noticeReview, href: "/admin/automation/review" },
    { label: "Recruitments", value: recruitments, href: "/admin/recruitments" },
    { label: "Failed pipeline items", value: failed, href: "/admin/automation/failed" },
    { label: "Exams", value: examCount, href: "/admin/exams" },
    { label: "Jobs", value: jobCount, href: "/admin/jobs" },
    { label: "Exams awaiting review", value: inReviewCount, href: "/admin/exams" },
    { label: "Admin users", value: adminCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const body = (
            <>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</dd>
            </>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">{body}</Link>
          ) : (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4">{body}</div>
          );
        })}
      </div>

      <p className="text-sm text-slate-500">
        Start in <Link href="/admin/automation" className="text-brand-700 hover:underline">Automation</Link>: the pipeline fetches official notices, extracts them and files them under organizations and recruitments; you review and publish.
      </p>
    </div>
  );
}
