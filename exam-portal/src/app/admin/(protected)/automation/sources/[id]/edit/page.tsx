import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getSourceForAdmin, sourceHealth, enablePolicyError } from "@/lib/services/sources";
import { listOrganizations } from "@/lib/services/lookups";
import { REGION_BY_CODE } from "@/lib/sources/regions";
import { SourceForm } from "../../SourceForm";
import { updateSourceAction, checkSourceNowAction, setApprovalAction, verifySourceAction, discoverSourcesAction, deleteSourceAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Source" };

function fmt(d: Date | null | undefined) {
  return d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

const btn = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default async function EditSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; checked?: string; verified?: string; discovered?: string; updated?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const { id } = await params;
  const { saved, error, checked, verified, discovered, updated } = await searchParams;
  const [source, organizations] = await Promise.all([getSourceForAdmin(id), listOrganizations()]);
  if (!source) notFound();
  const health = sourceHealth(source);
  const enableBlocker = enablePolicyError(source);
  const back = `/admin/automation/sources/${id}/edit`;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/admin/automation/sources" className="text-sm text-brand-700 hover:underline">
          ← Back to sources
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{source.name}</h1>
          <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">{health}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {source.category}
          {source.stateCode ? ` · ${REGION_BY_CODE.get(source.stateCode)?.name ?? source.stateCode}` : ""}
          {source.groupName ? ` · group ${source.groupName}` : ""}
          {source.discoveredFrom ? (
            <>
              {" · discovered from "}
              <Link href={`/admin/automation/sources/${source.discoveredFrom.id}/edit`} className="text-brand-700 hover:underline">
                {source.discoveredFrom.name}
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {saved ? <Note tone="ok">Saved.</Note> : null}
      {updated ? <Note tone="ok">Updated.</Note> : null}
      {checked ? <Note tone="ok">Check finished — see the latest row under “Recent checks”.</Note> : null}
      {verified ? <Note tone="ok">Verification finished — see the status below.</Note> : null}
      {discovered ? <Note tone="ok">Discovery saved {discovered} new source(s) as “awaiting approval”.</Note> : null}
      {error ? <Note tone="bad">{error}</Note> : null}

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Approval</h2>
          <p className="mt-1 font-medium text-slate-900">{source.approvalStatus}</p>
          <div className="mt-2 flex gap-2">
            {source.approvalStatus !== "APPROVED" ? (
              <form action={setApprovalAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="decision" value="APPROVED" />
                <input type="hidden" name="returnTo" value={back} />
                <button className={btn}>Approve</button>
              </form>
            ) : null}
            {source.approvalStatus !== "REJECTED" ? (
              <form action={setApprovalAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="decision" value="REJECTED" />
                <input type="hidden" name="returnTo" value={back} />
                <button className={btn}>Reject</button>
              </form>
            ) : null}
          </div>
          {enableBlocker && !source.active ? <p className="mt-2 text-xs text-amber-700">Can’t enable yet: {enableBlocker}</p> : null}
        </div>
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Verification</h2>
          <p className="mt-1 font-medium text-slate-900">
            {source.verificationStatus} <span className="text-xs font-normal text-slate-500">· last {fmt(source.lastVerifiedAt)}</span>
          </p>
          {source.verificationNote ? <p className="mt-1 text-xs whitespace-pre-line text-slate-600">{source.verificationNote}</p> : null}
          <form action={verifySourceAction} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={id} />
            {source.isAggregator ? (
              <label className="flex items-center gap-1 text-xs text-slate-700">
                <input type="checkbox" name="termsReviewed" />I read the site’s terms of use and they permit automated access
              </label>
            ) : null}
            <button className={btn}>Verify now</button>
          </form>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <form action={checkSourceNowAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-900">
            Run now
          </button>
        </form>
        <Link href={`/admin/automation/sources/${id}/test`} className={btn}>
          Test (dry run)
        </Link>
        {source.approvalStatus === "APPROVED" && !source.discoveredFromId ? (
          <form action={discoverSourcesAction}>
            <input type="hidden" name="id" value={id} />
            <button className={btn} title="Reads this page's navigation, feeds and sitemaps and proposes new sources for approval">
              Discover sources
            </button>
          </form>
        ) : null}
        <form action={deleteSourceAction} className="ml-auto">
          <input type="hidden" name="id" value={id} />
          <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete source</button>
        </form>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Last attempt" value={fmt(source.lastCheckedAt)} />
        <Stat label="Last fetch OK" value={fmt(source.lastSuccessAt)} />
        <Stat label="Last extraction OK" value={fmt(source.lastExtractionAt)} />
        <Stat label="Next check" value={source.blockedUntil && source.blockedUntil > new Date() ? `paused until ${fmt(source.blockedUntil)}` : fmt(source.nextCheckAt)} />
        <Stat label="HTTP / outcome" value={`${source.lastHttpStatus ?? "—"} · ${source.lastOutcome ?? "—"}`} />
        <Stat label="Failures in a row" value={String(source.consecutiveFailures)} />
        <Stat label="Documents found" value={String(source.discoveredCount)} />
        <Stat label="New notices added" value={String(source.noticesInserted)} />
      </dl>
      {source.robotsStatus ? <p className="-mt-3 text-xs text-slate-500">robots: {source.robotsStatus}</p> : null}

      <SourceForm action={updateSourceAction.bind(null, id)} initial={source} organizations={organizations} submitLabel="Save Changes" />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Recent checks</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Outcome</th>
                <th className="px-4 py-2">HTTP</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Links</th>
                <th className="px-4 py-2">Notices</th>
                <th className="px-4 py-2">Dup</th>
              </tr>
            </thead>
            <tbody>
              {source.checks.map((check) => (
                <tr key={check.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">
                    <Link href={`/admin/automation/sources/${id}/checks/${check.id}`} className="text-brand-700 hover:underline">
                      {fmt(check.startedAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className={check.ok ? "text-emerald-700" : "text-red-600"} title={check.error ?? undefined}>
                      {check.outcome ?? (check.ok ? "ok" : "failed")}
                      {check.error ? ` — ${check.error.slice(0, 70)}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{check.httpStatus ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{check.durationMs != null ? `${(check.durationMs / 1000).toFixed(1)} s` : "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{check.itemsFound}</td>
                  <td className="px-4 py-2 text-slate-600">{check.noticesExtracted}</td>
                  <td className="px-4 py-2 text-slate-600">{check.duplicatesSkipped}</td>
                </tr>
              ))}
              {source.checks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Not checked yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Note({ tone, children }: { tone: "ok" | "bad"; children: React.ReactNode }) {
  return (
    <p role={tone === "bad" ? "alert" : undefined} className={`rounded-md px-3 py-2 text-sm ${tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {children}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 truncate font-medium text-slate-900" title={value}>
        {value}
      </dd>
    </div>
  );
}
