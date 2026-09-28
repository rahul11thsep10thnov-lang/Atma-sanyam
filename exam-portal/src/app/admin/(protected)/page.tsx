import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [examCount, jobCount, inReviewCount, adminCount] = await Promise.all([
    prisma.exam.count(),
    prisma.job.count(),
    prisma.exam.count({ where: { status: "IN_REVIEW" } }),
    prisma.adminUser.count(),
  ]);

  const stats = [
    { label: "Exams", value: examCount },
    { label: "Jobs", value: jobCount },
    { label: "Exams awaiting review", value: inReviewCount },
    { label: "Admin users", value: adminCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {stat.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">
              {stat.value}
            </dd>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Content management (Jobs, Exams, Results, Admit Cards, Answer Keys,
        Syllabus, Admissions, Scholarships, Articles) and the AI extraction
        pipeline arrive in later phases — see{" "}
        <code className="font-mono">DEVELOPMENT_STATUS.md</code>.
      </p>
    </div>
  );
}
