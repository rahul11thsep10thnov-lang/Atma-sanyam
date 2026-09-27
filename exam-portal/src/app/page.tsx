import { prisma } from "@/lib/db/client";

export default async function HomePage() {
  const adminCount = await prisma.adminUser.count();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
      <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-medium tracking-wide text-amber-900 uppercase">
        Foundation build — Phase 1
      </span>

      <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
        Exam Portal
      </h1>

      <p className="max-w-xl text-base leading-relaxed text-slate-600">
        An original, independent government examination information platform
        — Jobs, Results, Admit Cards, Answer Keys, Syllabus and more — built
        separately from the FOCUS app in this repository.
      </p>

      <dl className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Database
          </dt>
          <dd className="mt-1 text-sm text-slate-900">
            Connected (PostgreSQL via Prisma)
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Admin users provisioned
          </dt>
          <dd className="mt-1 text-sm text-slate-900">{adminCount}</dd>
        </div>
      </dl>

      <p className="text-sm text-slate-500">
        See <code className="font-mono">PROJECT_PLAN.md</code>,{" "}
        <code className="font-mono">ARCHITECTURE.md</code>,{" "}
        <code className="font-mono">DATABASE_SCHEMA.md</code> and{" "}
        <code className="font-mono">DEVELOPMENT_STATUS.md</code> for the full
        plan and what comes next.
      </p>
    </main>
  );
}
