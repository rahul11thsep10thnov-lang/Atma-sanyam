"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { overview } from "@/lib/cms/pipeline/runner";
import type { CmsDestination, PipelineStage } from "@/lib/cms/types";
import { api, btnDanger, btnPrimary, btnSaffron, btnSecondary, fmtDate, Notice, StageBadge, StatusBadge } from "./ui";

type Overview = ReturnType<typeof overview>;

const RUNNING: PipelineStage[] = ["RESEARCHING", "ATTRACTIONS", "IMAGES", "FINALIZING"];

/**
 * Pipeline progress: N/M destinations done, counters per state, the current
 * destination's log, and the three admin controls — run, approve images,
 * publish — plus retry/skip/reset for failures. Everything is persisted, so
 * closing the browser and coming back resumes exactly here.
 */
export function PipelineDashboard({ initial, base }: { initial: Overview; base: string }) {
  const router = useRouter();
  const [o, setO] = useState<Overview>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try { setO(await api<Overview>("/api/admin/cms/pipeline")); } catch { /* keep last state */ }
  }, []);

  useEffect(() => {
    if (o.current && RUNNING.includes(o.current.stage)) {
      const t = setTimeout(refresh, 2500);
      return () => clearTimeout(t);
    }
  }, [o, refresh]);

  async function act(action: string, id?: string) {
    setBusy(action);
    setMsg(null);
    try {
      const r = await api<Overview & { destination?: CmsDestination | null }>("/api/admin/cms/pipeline", { method: "POST", body: JSON.stringify({ action, id }) });
      setO(r);
      const d = r.destination;
      if (d) {
        const s = d.pipeline.stage;
        if (s === "AWAITING_APPROVAL") setMsg({ tone: "warn", text: `${d.name}: image candidates are ready — approve them to continue.` });
        else if (s === "READY_TO_PUBLISH") setMsg({ tone: "warn", text: `${d.name}: content and images are final. Review the page, then publish.` });
        else if (s === "FAILED") setMsg({ tone: "error", text: `${d.name} failed: ${d.pipeline.last_error}. Fix the cause and press Retry — the pipeline resumes at this destination, not at the start.` });
        else if (s === "COMPLETED") setMsg({ tone: "ok", text: `${d.name} published. ${r.current ? `Next: ${r.current.name}.` : "The queue is finished."}` });
        else setMsg({ tone: "ok", text: `${d.name}: ${s.replace(/_/g, " ").toLowerCase()}.` });
      } else if (action === "run" && !r.current) setMsg({ tone: "ok", text: "Nothing left in the queue." });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  }

  const pct = o.total ? Math.round((o.completed / o.total) * 100) : 0;
  const cur = o.current;
  const counters: Array<[string, number, string]> = [["Completed", o.completed, "text-forest-700"], ["Pending", o.pending, "text-charcoal"], ["In progress", o.in_progress, "text-sky-700"], ["Needs review", o.needs_review, "text-saffron-700"], ["Failed", o.failed, "text-terracotta-700"], ["Skipped", o.skipped, "text-charcoal-light"]];

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-3xl font-bold text-forest-700">{o.completed} / {o.total} <span className="text-base font-normal text-charcoal-light">destinations published</span></p>
            <p className="text-xs text-charcoal-light">Processed strictly one at a time. Progress is saved after every stage; you can close this tab and resume later.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(busy) || !cur || cur.stage === "AWAITING_APPROVAL" || cur.stage === "READY_TO_PUBLISH"} onClick={() => act("run")} className={btnPrimary}>{busy === "run" ? "Running…" : cur?.stage === "FAILED" ? "Retry current" : "Run next destination"}</button>
            {o.total > 0 && <button type="button" disabled={Boolean(busy)} onClick={() => confirm("Remove every unfinished destination from the queue? Their drafts are kept.") && act("clear")} className={btnDanger}>Clear queue</button>}
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {counters.map(([l, v, c]) => <div key={l} className="rounded-lg bg-forest-50/60 p-3 text-center"><p className={`font-display text-2xl font-bold ${c}`}>{v}</p><p className="text-xs text-charcoal-light">{l}</p></div>)}
        </div>
      </div>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {cur ? (
        <section className="card-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-forest-700">Current: #{cur.position} {cur.name}</h2>
            <StageBadge stage={cur.stage} />
            <span className="ml-auto flex flex-wrap gap-2">
              <Link href={`${base}/destinations/${cur.id}`} className={btnSecondary}>Open editor</Link>
              {cur.stage === "AWAITING_APPROVAL" && <Link href={`${base}/destinations/${cur.id}/images`} className={btnSaffron}>Approve images</Link>}
              {cur.stage === "READY_TO_PUBLISH" && <a href={`${base.replace(/\/admin$/, "")}/destinations/${cur.slug}?preview=1`} target="_blank" rel="noreferrer" className={btnSecondary}>Preview page</a>}
              {cur.stage === "READY_TO_PUBLISH" && <button type="button" disabled={Boolean(busy)} onClick={() => act("publish", cur.id)} className={btnSaffron}>{busy === "publish" ? "Publishing…" : "Publish & continue"}</button>}
              {cur.stage === "FAILED" && <button type="button" disabled={Boolean(busy)} onClick={() => act("retry", cur.id)} className={btnPrimary}>Retry</button>}
              <button type="button" disabled={Boolean(busy)} onClick={() => act("reset", cur.id)} className={btnSecondary}>Restart from research</button>
              <button type="button" disabled={Boolean(busy)} onClick={() => confirm(`Skip ${cur.name}?`) && act("skip", cur.id)} className={btnSecondary}>Skip</button>
            </span>
          </div>
          {cur.last_error && <p className="mt-2 text-sm text-terracotta-700">Last error: {cur.last_error}</p>}
          <ol className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-forest-50/50 p-3 font-mono text-xs">
            {cur.log.map((l, i) => <li key={i} className={l.level === "error" ? "text-terracotta-700" : l.level === "warn" ? "text-saffron-700" : "text-charcoal"}>{fmtDate(l.at)} · {l.stage} · {l.message}</li>)}
            {cur.log.length === 0 && <li className="text-charcoal-light">Not started yet — press “Run next destination”.</li>}
          </ol>
          <ol className="mt-3 flex flex-wrap gap-1 text-[11px]">
            {(["QUEUED", "RESEARCHING", "ATTRACTIONS", "IMAGES", "AWAITING_APPROVAL", "FINALIZING", "READY_TO_PUBLISH", "COMPLETED"] as PipelineStage[]).map((s, i, arr) => {
              const idx = arr.indexOf(cur.stage);
              const tone = i < idx ? "bg-forest-600 text-white" : i === idx ? "bg-saffron-500 text-white" : "bg-forest-50 text-charcoal-light";
              return <li key={s} className={`rounded-full px-2 py-0.5 ${tone}`}>{s.replace(/_/g, " ")}</li>;
            })}
          </ol>
        </section>
      ) : (
        <Notice tone="info">{o.total === 0 ? <>The queue is empty. <Link href={`${base}/import`} className="font-semibold underline">Import a PDF</Link> or add destinations from the table to start.</> : "Every queued destination is finished."}</Notice>
      )}

      {o.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-forest-100 bg-white">
          <table className="min-w-full divide-y divide-forest-100 text-sm">
            <thead className="bg-forest-50 text-left text-xs font-semibold uppercase tracking-wide text-forest-700">
              <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Destination</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Attractions</th><th className="px-3 py-2">Candidates</th><th className="px-3 py-2">Approved</th><th className="px-3 py-2">Error</th><th className="px-3 py-2">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {o.items.map((it) => (
                <tr key={it.id} className={cur?.id === it.id ? "bg-saffron-50/50" : undefined}>
                  <td className="px-3 py-2 text-charcoal-light">{it.position}</td>
                  <td className="px-3 py-2"><Link href={`${base}/destinations/${it.id}`} className="font-medium text-charcoal hover:text-forest-700">{it.name}</Link></td>
                  <td className="px-3 py-2"><StageBadge stage={it.stage} /></td>
                  <td className="px-3 py-2"><StatusBadge status={it.status} /></td>
                  <td className="px-3 py-2 text-charcoal-light">{it.attractions}</td>
                  <td className="px-3 py-2 text-charcoal-light">{it.candidates}</td>
                  <td className="px-3 py-2 text-charcoal-light">{it.approved}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-terracotta-700" title={it.last_error ?? ""}>{it.last_error ?? ""}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {it.stage === "AWAITING_APPROVAL" && <Link href={`${base}/destinations/${it.id}/images`} className="mr-2 text-saffron-700 hover:underline">Approve images</Link>}
                    {it.stage === "READY_TO_PUBLISH" && <button type="button" disabled={Boolean(busy)} onClick={() => act("publish", it.id)} className="mr-2 text-forest-700 hover:underline">Publish</button>}
                    {it.stage === "FAILED" && <button type="button" disabled={Boolean(busy)} onClick={() => act("retry", it.id)} className="mr-2 text-forest-700 hover:underline">Retry</button>}
                    {(it.stage === "SKIPPED" || it.stage === "FAILED") && <button type="button" disabled={Boolean(busy)} onClick={() => act("reset", it.id)} className="mr-2 text-charcoal hover:underline">Reset</button>}
                    {!["COMPLETED", "SKIPPED"].includes(it.stage) && it.id !== cur?.id && <button type="button" disabled={Boolean(busy)} onClick={() => act("skip", it.id)} className="text-charcoal-light hover:underline">Skip</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
