import Link from "next/link";
import type { JobSummary } from "@/lib/services/home";
import { formatDate } from "@/lib/format";

export function JobCard({ job }: { job: JobSummary }) {
  const deadline = formatDate(job.applicationEndDate);
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-600"
    >
      <h3 className="text-sm font-medium text-slate-900">{job.title}</h3>
      <p className="text-xs text-slate-500">{job.organizationName}</p>
      {deadline ? (
        <p className="mt-1 text-xs font-medium text-brand-700">
          Apply by {deadline}
        </p>
      ) : null}
    </Link>
  );
}
