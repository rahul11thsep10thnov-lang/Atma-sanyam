import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { inboxCounts, listNotices } from "@/lib/pipeline/review";
import { listSourcesForAdmin, sourceHealth } from "@/lib/services/sources";
import { NoticeStatusBadge, NoticeTypeBadge, PriorityBadge } from "@/components/admin/NoticeBadges";
import { runPipelineNowAction, setPausedAction } from "./actions";

export const metadata: Metadata = { title: "Automation" };

function fmt(d: Date | null | undefined) {
  return d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export default async function AutomationOverviewPage({ searchParams }: { searchParams: Promise<{ ran?: string; paused?: string }> }) {
  const admin = await requireAdmin();
  const { ran, paused: pausedParam } = await searchParams;
  const [counts, sources, urgent] = await Promise.all([
    inboxCounts(),
    listSourcesForAdmin(),
    listNotices({ status: "INBOX", pageSize: 8 }),
  ]);
  const canOperate = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";
  const failing = sources.filter((s) => s.active && sourceHealth(s) === "failing").length;

  const cards = [
    { label: "Inbox", value: counts.inbox, href: "/admin/automation/inbox", hint: "new + needs review + approved" },
    { label: "Needs review", value: counts.byStatus.NEEDS_REVIEW, href: "/admin/automation/review" },
    { label: "Ready to publish", value: counts.byStatus.AUTO_APPROVED + counts.byStatus.APPROVED, href: "/admin/automation/inbox?status=APPROVED", hint: "auto-approved + approved" },
    { label: "Published", value: counts.byStatus.PUBLISHED, href: "/admin/automation/inbox?status=PUBLISHED" },
    { label: "Duplicates", value: counts.byStatus.DUPLICATE, href: "/admin/automation/duplicates" },
    { label: "Failed items", value: counts.failedItems, href: "/admin/automation/failed", warn: counts.failedItems > 0 },
    { label: "Sources failing", value: `${failing} / ${counts.sourcesTotal}`, href: "/admin/automation/sources", warn: failing > 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Automation</h1>
          <p className="mt-1 text-sm text-slate-600">
            What the pipeline fetched, extracted and resolved — review here, publish from here.
            {counts.running ? <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">a run is in progress since {fmt(counts.running.startedAt)}</span> : null}
            {counts.paused ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">scheduled runs are paused</span> : null}
          </p>
        </div>
        {canOperate ? (
          <div className="flex gap-2">
            <form action={runPipelineNowAction}>
              <input type="hidden" name="returnTo" value="/admin/automation" />
              <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Run pipeline now
              </button>
            </form>
            <form action={setPausedAction}>
              <input type="hidden" name="returnTo" value="/admin/automation" />
              <input type="hidden" name="paused" value={counts.paused ? "false" : "true"} />
              <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {counts.paused ? "Resume schedule" : "Pause schedule"}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {ran ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {ran === "running" ? "A run was already in progress — nothing started." : ran === "paused" ? "The schedule is paused." : `Pipeline run ${ran.toLowerCase()}.`}
        </p>
      ) : null}
      {pausedParam ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          Scheduled runs {pausedParam === "true" ? "paused" : "resumed"}.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`rounded-lg border bg-white p-4 hover:bg-slate-50 ${c.warn ? "border-red-200" : "border-slate-200"}`}>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{c.label}</dt>
            <dd className={`mt-1 text-2xl font-semibold ${c.warn ? "text-red-700" : "text-slate-900"}`}>{c.value}</dd>
            {c.hint ? <div className="text-xs text-slate-400">{c.hint}</div> : null}
          </Link>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Last run</h2>
        {counts.lastRun ? (
          <p className="mt-1 text-sm text-slate-600">
            {fmt(counts.lastRun.startedAt)} · {counts.lastRun.trigger} · {counts.lastRun.status} · {counts.lastRun.sourcesChecked} sources, {counts.lastRun.newDocuments} new documents,{" "}
            {counts.lastRun.newNotices} new / {counts.lastRun.updatedNotices} updated notices, {counts.lastRun.duplicates} duplicates, {counts.lastRun.needsReview} to review,{" "}
            {counts.lastRun.autoPublished} auto-approved, {counts.lastRun.failures} failures.{" "}
            <Link href="/admin/automation/pipeline" className="text-brand-700 hover:underline">All runs</Link>
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">No run yet. Press “Run pipeline now”, set <code className="font-mono">CRON_SECRET</code> for the cron, or start <code className="font-mono">npm run pipeline:worker</code>.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Waiting for you</h2>
          <Link href="/admin/automation/inbox" className="text-sm text-brand-700 hover:underline">Open inbox</Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {urgent.rows.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
              <PriorityBadge priority={n.priority} />
              <NoticeTypeBadge type={n.noticeType} />
              <Link href={`/admin/automation/inbox/${n.id}`} className="font-medium text-slate-900 hover:underline">{n.title}</Link>
              <span className="text-xs text-slate-500">{n.organization?.name ?? "no organization"}</span>
              <span className="ml-auto"><NoticeStatusBadge status={n.status} /></span>
            </li>
          ))}
          {urgent.rows.length === 0 ? <li className="px-4 py-4 text-sm text-slate-500">Inbox is empty.</li> : null}
        </ul>
      </section>
    </div>
  );
}
