import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import {
  listSourcesPage,
  sourceDashboardStats,
  sourceFilterOptions,
  sourceHealth,
  type SourceFilters,
  type SourceHealth,
} from "@/lib/services/sources";
import { SOURCE_CATEGORIES, SOURCE_CATEGORY_LABEL, SOURCE_TYPES } from "@/lib/validation/source";
import { REGION_BY_CODE } from "@/lib/sources/regions";
import type { SourceCategory, SourceType } from "@/generated/prisma/enums";
import { bulkSourcesAction, rowSourceAction } from "./actions";

export const metadata: Metadata = { title: "Sources" };

const HEALTH_CLASS: Record<SourceHealth, string> = {
  healthy: "bg-emerald-100 text-emerald-800",
  attention: "bg-amber-100 text-amber-800",
  stale: "bg-amber-100 text-amber-800",
  failing: "bg-red-100 text-red-700",
  blocked: "bg-red-100 text-red-700",
  never: "bg-slate-100 text-slate-600",
  disabled: "bg-slate-100 text-slate-500",
  pending: "bg-violet-100 text-violet-800",
};
const HEALTHS: SourceHealth[] = ["healthy", "attention", "failing", "blocked", "stale", "never", "disabled", "pending"];

function fmt(d: Date | null | undefined) {
  return d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

type SP = { q?: string; category?: string; state?: string; type?: string; health?: string; enabled?: string; approval?: string; group?: string; page?: string; error?: string; notice?: string; deleted?: string };

export default async function SourcesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const sp = await searchParams;
  const filters: SourceFilters = {
    q: sp.q?.trim() || undefined,
    category: SOURCE_CATEGORIES.includes(sp.category as SourceCategory) ? (sp.category as SourceCategory) : undefined,
    stateCode: sp.state && REGION_BY_CODE.has(sp.state) ? sp.state : undefined,
    sourceType: SOURCE_TYPES.includes(sp.type as SourceType) ? (sp.type as SourceType) : undefined,
    health: HEALTHS.includes(sp.health as SourceHealth) ? (sp.health as SourceHealth) : undefined,
    enabled: sp.enabled === "yes" || sp.enabled === "no" ? sp.enabled : undefined,
    approval: sp.approval === "PENDING" || sp.approval === "APPROVED" || sp.approval === "REJECTED" ? sp.approval : undefined,
    group: sp.group || undefined,
  };
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ total, items, pageSize }, stats, options] = await Promise.all([listSourcesPage(filters, page), sourceDashboardStats(), sourceFilterOptions()]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const query = new URLSearchParams(Object.entries({ q: sp.q, category: sp.category, state: sp.state, type: sp.type, health: sp.health, enabled: sp.enabled, approval: sp.approval, group: sp.group }).filter(([, v]) => v) as Array<[string, string]>);
  const here = `/admin/automation/sources${query.toString() ? `?${query}` : ""}`;
  const pageHref = (p: number) => {
    const q = new URLSearchParams(query);
    q.set("page", String(p));
    return `/admin/automation/sources?${q}`;
  };

  const cards: Array<{ label: string; value: string | number; href?: string; warn?: boolean }> = [
    { label: "Total sources", value: stats.total, href: "/admin/automation/sources" },
    { label: "Active", value: stats.active, href: "/admin/automation/sources?enabled=yes&approval=APPROVED" },
    { label: "Healthy", value: stats.healthy, href: "/admin/automation/sources?health=healthy" },
    { label: "Need attention", value: stats.needsAttention, href: "/admin/automation/sources?health=attention", warn: stats.needsAttention > 0 },
    { label: "Disabled", value: stats.disabled, href: "/admin/automation/sources?health=disabled" },
    { label: "Awaiting approval", value: stats.awaitingApproval, href: "/admin/automation/sources?approval=PENDING", warn: stats.awaitingApproval > 0 },
    { label: "Last successful run", value: fmt(stats.lastSuccessfulRun?.startedAt), href: "/admin/automation/pipeline" },
    { label: "Notices discovered", value: stats.noticesDiscovered, href: "/admin/automation/inbox" },
    { label: "New in latest run", value: stats.newNoticesLatestRun, href: "/admin/automation/pipeline" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sources</h1>
          <p className="mt-1 text-sm text-slate-600">
            Official recruitment pages, feeds and (for discovery only) public aggregators. A source is checked only when it is approved and enabled; an HTTP 200 with
            nothing parsed counts as <em>needs attention</em>, not healthy.
          </p>
        </div>
        <Link href="/admin/automation/sources/new" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Add source
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        {cards.map((c) => (
          <Link key={c.label} href={c.href ?? "#"} className={`rounded-lg border bg-white p-3 hover:border-slate-300 ${c.warn ? "border-amber-300" : "border-slate-200"}`}>
            <dt className="text-[0.7rem] font-medium tracking-wide text-slate-500 uppercase">{c.label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{c.value}</dd>
          </Link>
        ))}
      </dl>

      {sp.error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p> : null}
      {sp.notice ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.notice}</p> : null}
      {sp.deleted ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Source deleted.</p> : null}

      <form className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm" method="get">
        <Filter label="Search">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="name or domain" className="w-44 rounded border border-slate-300 px-2 py-1.5" />
        </Filter>
        <Filter label="Category">
          <select name="category" defaultValue={sp.category ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {SOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{SOURCE_CATEGORY_LABEL[c]}</option>)}
          </select>
        </Filter>
        <Filter label="State / UT">
          <select name="state" defaultValue={sp.state ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {options.states.map((s) => <option key={s} value={s}>{REGION_BY_CODE.get(s)?.name ?? s}</option>)}
          </select>
        </Filter>
        <Filter label="Type">
          <select name="type" defaultValue={sp.type ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Filter>
        <Filter label="Health">
          <select name="health" defaultValue={sp.health ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {HEALTHS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </Filter>
        <Filter label="Enabled">
          <select name="enabled" defaultValue={sp.enabled ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            <option value="yes">Enabled</option>
            <option value="no">Disabled</option>
          </select>
        </Filter>
        <Filter label="Approval">
          <select name="approval" defaultValue={sp.approval ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            <option value="PENDING">Awaiting approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </Filter>
        <Filter label="Group">
          <select name="group" defaultValue={sp.group ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {options.groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Filter>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white">Filter</button>
        <Link href="/admin/automation/sources" className="px-2 py-1.5 text-slate-500 hover:underline">Reset</Link>
      </form>

      <div className="flex flex-col gap-2">
        {/* Row checkboxes join this form through their form="bulk" attribute,
            so each row can keep its own small forms for single actions. */}
        <form id="bulk" action={bulkSourcesAction} className="flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="returnTo" value={here} />
          <span className="text-slate-600">With selected:</span>
          {[
            ["approve", "Approve"],
            ["reject", "Reject"],
            ["enable", "Enable"],
            ["disable", "Disable"],
            ["test", "Test (verify, max 25)"],
            ["run", "Run now (max 25)"],
          ].map(([op, label]) => (
            <button key={op} type="submit" name="op" value={op} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50">
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">
            {total} matching · page {page} of {pages}
          </span>
        </form>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2" />
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Health</th>
                <th className="px-3 py-2">Last attempt / success</th>
                <th className="px-3 py-2">HTTP · time</th>
                <th className="px-3 py-2">Latest check</th>
                <th className="px-3 py-2">Totals</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((source) => {
                const health = sourceHealth(source);
                const last = source.checks[0];
                return (
                  <tr key={source.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <input type="checkbox" form="bulk" name="ids" value={source.id} aria-label={`Select ${source.name}`} />
                    </td>
                    <td className="max-w-sm px-3 py-2">
                      <Link href={`/admin/automation/sources/${source.id}/edit`} className="font-medium text-brand-700 hover:underline">
                        {source.name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {source.officialDomain} · {source.sourceType} · {source.category}
                        {source.stateCode ? ` · ${source.stateCode}` : ""}
                        {source.groupName ? ` · ${source.groupName}` : ""} · {source.priority} every {source.checkFrequencyMinutes}m
                      </div>
                      <div className="text-xs text-slate-400">
                        verification: {source.verificationStatus.toLowerCase()}
                        {source.isAggregator ? " · aggregator (discovery only)" : ""}
                      </div>
                      {source.lastError ? (
                        <div className="mt-1 line-clamp-2 text-xs text-red-600" title={source.lastError}>
                          {source.lastError}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${HEALTH_CLASS[health]}`}>{health}</span>
                      {source.blockedUntil && source.blockedUntil > new Date() ? <div className="mt-1 text-xs text-slate-500">paused until {fmt(source.blockedUntil)}</div> : null}
                      {source.consecutiveFailures ? <div className="mt-1 text-xs text-slate-500">{source.consecutiveFailures} failed in a row</div> : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      <div>{fmt(source.lastCheckedAt)}</div>
                      <div>fetch ok: {fmt(source.lastSuccessAt)}</div>
                      <div>extracted: {fmt(source.lastExtractionAt)}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {source.lastHttpStatus ?? "—"}
                      <div className="text-slate-400">{source.lastDurationMs != null ? `${(source.lastDurationMs / 1000).toFixed(1)} s` : ""}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {last ? (
                        <Link href={`/admin/automation/sources/${source.id}/checks/${last.id}`} className="text-brand-700 hover:underline">
                          {last.outcome ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {last ? (
                        <div className="text-slate-400">
                          {last.itemsFound} links · {last.noticesExtracted} notices · {last.duplicatesSkipped} dup
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {source._count.documents} docs · {source._count.notices} notices
                      <div className="text-slate-400">{source.noticesInserted} new notices added</div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <div className="flex flex-col items-end gap-1">
                        {source.approvalStatus !== "APPROVED" ? <RowButton op="approve" id={source.id} returnTo={here} label="Approve" className="text-violet-700" /> : null}
                        <Link href={`/admin/automation/sources/${source.id}/test`} className="text-brand-700 hover:underline">
                          Test
                        </Link>
                        <RowButton op={source.active ? "disable" : "enable"} id={source.id} returnTo={here} label={source.active ? "Disable" : "Enable"} className="text-brand-700" />
                        <Link href={`/admin/automation/sources/${source.id}/edit`} className="text-slate-600 hover:underline">
                          Edit / delete
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No sources match. Run <code className="font-mono">npm run seed:sources</code> for the registry, or add one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 ? (
        <nav className="flex items-center gap-2 text-sm">
          {page > 1 ? <Link href={pageHref(page - 1)} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">← Previous</Link> : null}
          <span className="text-slate-500">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={pageHref(page + 1)} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Next →</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}

function RowButton({ op, id, returnTo, label, className }: { op: string; id: string; returnTo: string; label: string; className: string }) {
  return (
    <form action={rowSourceAction}>
      <input type="hidden" name="row" value={`${op}:${id}`} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className={`${className} hover:underline`}>
        {label}
      </button>
    </form>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
