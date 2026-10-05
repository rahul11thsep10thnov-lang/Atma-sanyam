import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { JobRow, Metrics, productionApi } from "../../api/production";

const QUEUES = ["studio", "image-generation", "segmentation", "depth-generation", "inpainting", "i2v", "2.5d-render", "studio-render", "qc"];

/** Queues, GPU workers, stage latency/failure rates, render throughput, and the global job list. */
export function ProductionOpsPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [queue, setQueue] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [mm, jj] = await Promise.all([productionApi.metrics(24), productionApi.jobs({ queue, status })]);
      setM(mm);
      setJobs(jj.jobs);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [queue, status]);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>Production operations</h1>
      {error && <p className="error">{error}</p>}
      {m && (
        <>
          <div className="stat-grid">
            <Stat label="Shots rendered (24h)" value={m.rendering.shotsRendered} />
            <Stat label="Reused from cache" value={m.rendering.shotsReusedFromCache} />
            <Stat label={`Render fps (${m.rendering.primaryProfile ?? "—"})`} value={m.rendering.averageFps ? m.rendering.averageFps.toFixed(1) : "—"} />
            <Stat label={`Render s / video s (${m.rendering.primaryProfile ?? "—"})`} value={m.rendering.renderSecondsPerVideoSecond ? m.rendering.renderSecondsPerVideoSecond.toFixed(1) : "—"} />
            <Stat label={`90 s videos / month / render host at ${m.rendering.primaryProfile ?? "—"}`} value={m.rendering.estimatedMonthlyCapacityPerRenderHost ?? "—"} />
            <Stat label="Asset reuse" value={`${m.assetReuse.REUSE ?? 0} reused / ${m.assetReuse.GENERATE ?? 0} new`} />
          </div>

          {m.rendering.byProfile.length > 1 && (
            <p className="small muted">
              Throughput by output profile:{" "}
              {m.rendering.byProfile.map((p) => `${p.profile}: ${p.renderSecondsPerVideoSecond?.toFixed(1) ?? "—"} render-s per video-s (${p.shots} shots)`).join(" · ")}
            </p>
          )}
          <section className="card">
            <h3>Queues</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Queue</th>
                  <th>Waiting</th>
                  <th>Running</th>
                  <th>Failed</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {m.queues.map((q) => (
                  <tr key={q.queue}>
                    <td>{q.queue}</td>
                    <td>{q.pending}</td>
                    <td>{q.processing}</td>
                    <td className={q.failed ? "error" : ""}>{q.failed}</td>
                    <td>{q.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h3>GPU workers</h3>
            {m.gpu.queues.filter((q) => q.warning).map((q) => (
              <p key={q.queue} className="error small">
                {q.queue}: {q.warning}
              </p>
            ))}
            {m.gpu.workers.length === 0 ? (
              <p className="small muted">No GPU worker has registered. GPU queues are served by procedural fallbacks on CPU workers until a GPU host runs `npm run worker:gpu`.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {m.gpu.workers.map((w) => (
                    <tr key={w.workerId}>
                      <td>
                        <strong>{w.workerId}</strong>
                        <div className="small muted">{w.hostname}</div>
                      </td>
                      <td className="small">
                        {w.gpuName} · {w.vramFreeGb.toFixed(1)}/{w.vramTotalGb.toFixed(1)} GB free
                      </td>
                      <td>
                        <span className={`badge ${w.status === "ONLINE" ? "badge-qc-passed" : "badge-qc-needs_review"}`}>{w.status}</span>
                      </td>
                      <td className="small">
                        {w.runningJobs}/{w.maxConcurrentJobs} slots · {w.queues.join(", ")}
                      </td>
                      <td className="small muted">{w.lastHeartbeatAt ? new Date(w.lastHeartbeatAt).toLocaleTimeString() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <h3>Stages (24h)</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Jobs</th>
                  <th>Failure rate</th>
                  <th>p50</th>
                  <th>p95</th>
                </tr>
              </thead>
              <tbody>
                {m.stages.map((s) => (
                  <tr key={s.type}>
                    <td>{s.type}</td>
                    <td>{s.jobs}</td>
                    <td className={s.failureRate > 0.05 ? "error" : ""}>{(s.failureRate * 100).toFixed(1)}%</td>
                    <td>{s.p50Ms != null ? `${(s.p50Ms / 1000).toFixed(1)}s` : "—"}</td>
                    <td>{s.p95Ms != null ? `${(s.p95Ms / 1000).toFixed(1)}s` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="card">
        <h3>Jobs</h3>
        <div className="action-row wrap">
          <select value={queue} onChange={(e) => setQueue(e.target.value)}>
            <option value="">all queues</option>
            {QUEUES.map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">any status</option>
            {["PENDING", "PROCESSING", "RETRYING", "COMPLETED", "FAILED", "CANCELLED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <table className="data-table">
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="small">
                  <Link to={`/studio/${j.storyId}`}>{j.story?.title ?? j.storyId}</Link>
                </td>
                <td>{j.type}</td>
                <td>
                  <span className={`badge badge-job-${j.status.toLowerCase()}`}>{j.status}</span> {j.status === "PROCESSING" && `${j.progress}%`}
                </td>
                <td className="small">{j.queue}</td>
                <td className="small">{[j.model, j.gpuWorkerId].filter(Boolean).join(" · ")}</td>
                <td className="small error">{j.error?.slice(0, 160)}</td>
                <td>
                  {["PENDING", "PROCESSING", "RETRYING"].includes(j.status) && (
                    <button type="button" className="secondary" disabled={busy} onClick={() => act(() => productionApi.cancelJob(j.id))}>
                      Cancel
                    </button>
                  )}
                  {["FAILED", "CANCELLED"].includes(j.status) && (
                    <button type="button" disabled={busy} onClick={() => act(() => productionApi.retryJob(j.id))}>
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <div className={String(value).length > 9 ? "stat-value stat-value-long" : "stat-value"}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
