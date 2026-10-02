import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getSourceForAdmin } from "@/lib/services/sources";
import { checkSource } from "@/lib/pipeline/sourceCheck";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Test Source" };

/**
 * "Test source": a dry run — fetch + parse the listing and show what the
 * pipeline *would* pick up, storing nothing. Lets an admin tune the
 * parser hint before enabling a source.
 */
export default async function TestSourcePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const { id } = await params;
  const source = await getSourceForAdmin(id);
  if (!source) notFound();

  const result = await checkSource(id, { dryRun: true, force: true });

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={`/admin/automation/sources/${id}/edit`} className="text-sm text-brand-700 hover:underline">
          ← Back to source
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Test: {source.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Dry run of <span className="font-mono text-xs">{source.listingUrl}</span> — nothing was stored.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Fetch" value={result.ok ? "ok" : "failed"} bad={!result.ok} />
        <Stat label="HTTP" value={result.httpStatus ? String(result.httpStatus) : "—"} />
        <Stat label="robots.txt" value={result.robotsStatus || "—"} bad={/blocked/.test(result.robotsStatus)} />
        <Stat label="Candidates" value={String(result.itemsFound)} />
      </dl>

      {result.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">URL</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">Date seen</th>
            </tr>
          </thead>
          <tbody>
            {result.candidates.map((c) => (
              <tr key={c.url} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">{c.title}</td>
                <td className="max-w-md truncate px-4 py-2 font-mono text-xs text-slate-500">
                  <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
                    {c.url}
                  </a>
                </td>
                <td className="px-4 py-2 text-slate-600">{c.isPdf ? "PDF" : "page"}</td>
                <td className="px-4 py-2 text-slate-500">{formatDate(c.publishedAt) ?? "—"}</td>
              </tr>
            ))}
            {result.ok && result.candidates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Fetched fine, but no PDF or recruitment-keyword links were found. Try a parser hint (CSS
                  selector) or a more specific listing URL.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className={`mt-1 truncate font-medium ${bad ? "text-red-700" : "text-slate-900"}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
