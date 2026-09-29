import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminApi } from "@/lib/auth/session";
import { getExtractionJob } from "@/lib/services/extraction";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Extraction job" };

export default async function ExtractionJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  await requireAdminApi();
  const { jobId } = await params;
  const job = await getExtractionJob(jobId);
  if (!job) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/documents" className="text-sm text-brand-700 hover:underline">
          ← Back to documents
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Extraction job — {job.document.filename}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Attempt #{job.attempt} · Status <span className="font-medium">{job.status}</span> ·
          Model <span className="font-mono">{job.aiModel ?? "—"}</span> ·{" "}
          {formatDate(job.createdAt)}
        </p>
        {job.error ? (
          <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {job.error}
          </p>
        ) : null}
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This is AI-extracted data — it has not been reviewed by a human yet
          and is never used to create or update published content on its
          own. A field marked &quot;uncertain&quot; especially needs a human
          check against the source document.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Field</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Confidence</th>
              <th className="px-4 py-2">Page</th>
              <th className="px-4 py-2">Flag</th>
            </tr>
          </thead>
          <tbody>
            {job.results.map((result) => (
              <tr key={result.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{result.fieldPath}</td>
                <td className="px-4 py-2 text-slate-700">
                  {result.value == null ? (
                    <span className="text-slate-400">— not extracted —</span>
                  ) : (
                    String(result.value)
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {result.confidence == null ? "—" : `${Math.round(result.confidence * 100)}%`}
                </td>
                <td className="px-4 py-2 text-slate-500">{result.sourcePage ?? "—"}</td>
                <td className="px-4 py-2">
                  {result.isUncertain ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Uncertain
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
            {job.results.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No fields extracted.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Accept/edit/reject actions for individual fields land in a later
        phase — this view is read-only.
      </p>
    </div>
  );
}
