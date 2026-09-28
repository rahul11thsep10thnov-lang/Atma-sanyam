import type { JobSummary } from "@/lib/services/home";
import { formatDate } from "@/lib/format";

/**
 * Job listings don't have a detail page yet (that's Phase 5: Exam & Job
 * system), so this renders as a preview, not a link, for now — no dead
 * `/jobs/[slug]` URLs from our own UI in the meantime.
 */
export function JobCard({ job }: { job: JobSummary }) {
  const deadline = formatDate(job.applicationEndDate);
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">{job.title}</h3>
      <p className="text-xs text-slate-500">{job.organizationName}</p>
      {deadline ? (
        <p className="mt-1 text-xs font-medium text-brand-700">
          Apply by {deadline}
        </p>
      ) : null}
    </article>
  );
}
