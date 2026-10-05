import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CAMERA_MOVES, InspectorLayer, PARTICLE_TYPES, productionApi, ShotDetail, ShotOverrides, TimelineSample } from "../../api/production";

/**
 * Shot Inspector: what the director decided, every layer and its asset
 * provenance, live preview of edits, overrides (camera, focus, light,
 * effects, environment, per-layer depth), re-render, QC and job history.
 */
export function ShotInspectorPage() {
  const { shotId } = useParams<{ shotId: string }>();
  const [d, setD] = useState<ShotDetail | null>(null);
  const [ov, setOv] = useState<ShotOverrides>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [previewT, setPreviewT] = useState(1.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    () =>
      productionApi
        .shot(shotId!)
        .then((x) => {
          setD(x);
          setOv(x.shot.overrides ?? {});
        })
        .catch((e) => setError(e.message)),
    [shotId],
  );
  useEffect(() => {
    load();
  }, [load]);
  const running = d?.jobs.some((j) => ["PENDING", "PROCESSING", "RETRYING"].includes(j.status)) ?? false;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => productionApi.shot(shotId!).then(setD).catch(() => undefined), 4000);
    return () => clearInterval(t);
  }, [running, shotId]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(await productionApi.preview(shotId!, ov, previewT));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!d) return <p>{error ?? "Loading…"}</p>;
  const s = d.shot;
  const current = d.renders.find((r) => r.isCurrent);
  const dur = s.renderDurationSeconds ?? s.durationSeconds;
  const set = <K extends keyof ShotOverrides>(k: K, v: ShotOverrides[K]) => setOv((o) => ({ ...o, [k]: v }));

  return (
    <div>
      <p>
        <Link to={`/studio/${s.storyId}`}>← Story</Link>
      </p>
      <div className="page-header">
        <h1>
          Shot {s.globalNumber} <span className="muted small">scene {s.scene.sceneNumber} · {s.scene.location}</span>
        </h1>
        <div>
          <span className={`badge badge-shot-${s.status.toLowerCase()}`}>{s.status}</span>
          <span className={`badge badge-safety-${s.safetyLevel.toLowerCase()}`}>{s.safetyLevel}</span>
          <span className="badge">{s.disclosure.replace(/_/g, " ").toLowerCase()}</span>
        </div>
      </div>
      {message && <p className="info">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="inspector-grid">
        <div>
          {current?.url ? <video key={current.url} className="render-video portrait" src={current.url} controls loop preload="metadata" /> : <div className="render-video portrait placeholder-thumb">not rendered yet</div>}
          <div className="action-row wrap">
            <label className="small">
              preview at {previewT.toFixed(1)}s
              <input type="range" min={0} max={dur} step={0.1} value={previewT} onChange={(e) => setPreviewT(Number(e.target.value))} />
            </label>
            <button type="button" disabled={busy} onClick={doPreview}>
              Preview frame
            </button>
          </div>
          {preview && <img className="render-video portrait" src={preview} alt="Preview with unsaved changes" />}
        </div>

        <div>
          <section className="card">
            <h3>Director</h3>
            <p>
              <strong>{s.shotType.replace(/_/g, " ")}</strong> · camera <strong>{s.cameraMovement.replace(/_/g, " ")}</strong> · {dur.toFixed(2)}s (planned {s.durationSeconds.toFixed(2)}s) · seed {s.seed}
            </p>
            <p>
              <em>Viewer sees:</em> {s.viewerSees}
            </p>
            <p>
              <em>Purpose:</em> {s.emotionalPurpose}
            </p>
            {s.narration && <p className="small">{s.narration}</p>}
            {s.dialogue.map((l, i) => (
              <p key={i} className="dialogue small">
                {l.speakerKey}: “{l.text}”
              </p>
            ))}
            <p className="small">
              Motion: <strong>{s.motionDecision}</strong> ({Math.round(s.motionConfidence * 100)}%) — {s.motionReason}. Renderer: <strong>{s.selectedRenderer}</strong>
            </p>
          </section>

          <section className="card">
            <h3>Overrides</h3>
            <div className="override-grid">
              <label>
                Camera move
                <select value={ov.camera?.type ?? s.camera.type} onChange={(e) => set("camera", { ...ov.camera, type: e.target.value })}>
                  {CAMERA_MOVES.map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <Slider label="Intensity" min={0} max={3} step={0.05} value={ov.camera?.intensity ?? s.camera.intensity} onChange={(v) => set("camera", { ...ov.camera, intensity: v })} />
              <Slider label="Focal length (mm)" min={14} max={135} step={1} value={ov.camera?.focalLength ?? s.camera.focalLength} onChange={(v) => set("camera", { ...ov.camera, focalLength: v })} />
              <Slider label="Aperture (blur)" min={0} max={60} step={0.5} value={ov.focus?.aperture ?? s.focusProfile.aperture} onChange={(v) => set("focus", { ...ov.focus, aperture: v })} />
              <label>
                Focus on
                <select value={ov.focus?.focusLayerKey ?? s.focusProfile.focusLayerKey ?? ""} onChange={(e) => set("focus", { ...ov.focus, focusLayerKey: e.target.value || undefined })}>
                  <option value="">depth {s.focusProfile.focusDepth.toFixed(2)}</option>
                  {d.layers.map((l) => (
                    <option key={l.layerKey} value={l.layerKey}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <Slider label="Ambient light" min={0} max={2} step={0.05} value={ov.lighting?.ambientIntensity ?? s.lightingProfile.ambient.intensity} onChange={(v) => set("lighting", { ambientIntensity: v })} />
              <Slider label="Grain" min={0} max={0.2} step={0.005} value={ov.effects?.grain ?? s.effectsProfile.grain} onChange={(v) => set("effects", { ...ov.effects, grain: v })} />
              <Slider label="Vignette" min={0} max={1} step={0.02} value={ov.effects?.vignette ?? s.effectsProfile.vignette} onChange={(v) => set("effects", { ...ov.effects, vignette: v })} />
              <Slider label="Bloom" min={0} max={1} step={0.02} value={ov.effects?.bloomIntensity ?? s.effectsProfile.bloom.intensity} onChange={(v) => set("effects", { ...ov.effects, bloomIntensity: v })} />
              <Slider label="Saturation" min={0} max={1.6} step={0.02} value={ov.effects?.saturation ?? s.effectsProfile.grade.saturation} onChange={(v) => set("effects", { ...ov.effects, saturation: v })} />
              <Slider label="Contrast" min={0.6} max={1.6} step={0.02} value={ov.effects?.contrast ?? s.effectsProfile.grade.contrast} onChange={(v) => set("effects", { ...ov.effects, contrast: v })} />
              <label>
                Renderer
                <select value={ov.renderer ?? "auto"} onChange={(e) => set("renderer", e.target.value as ShotOverrides["renderer"])}>
                  <option value="auto">auto (motion analyzer)</option>
                  <option value="engine25d">2.5D engine</option>
                  <option value="i2v">local I2V (if enabled and licence-cleared)</option>
                </select>
              </label>
            </div>
            <div className="chip-row">
              {PARTICLE_TYPES.filter((p) => s.environmentProfile.particles.some((x) => x.type === p)).map((p) => {
                const off = ov.environment?.disableParticles?.includes(p) ?? false;
                return (
                  <label key={p} className={`chip ${off ? "" : "chip-on"}`}>
                    <input type="checkbox" checked={!off} onChange={() => set("environment", { disableParticles: off ? (ov.environment?.disableParticles ?? []).filter((x) => x !== p) : [...(ov.environment?.disableParticles ?? []), p] })} />
                    {p}
                  </label>
                );
              })}
            </div>
            <div className="action-row wrap">
              <button type="button" disabled={busy} onClick={doPreview}>
                Preview changes
              </button>
              <button type="button" disabled={busy} onClick={() => run(() => productionApi.saveOverrides(shotId!, ov), "Overrides saved — the shot will be rebuilt and re-rendered")}>
                Save &amp; re-render
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => run(() => productionApi.saveOverrides(shotId!, {}), "Overrides cleared")}>
                Reset to director's plan
              </button>
              <button type="button" className="secondary" disabled={busy || !d.package} onClick={() => run(() => productionApi.rerender(shotId!), "Forced re-render queued")}>
                Force re-render
              </button>
            </div>
          </section>
        </div>
      </div>

      <section className="card">
        <h3>Layers (back to front)</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Asset</th>
              <th>Depth</th>
              <th>Provenance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {d.layers.map((l) => (
              <LayerRow key={l.id} l={l} busy={busy} run={run} ov={ov} setOv={setOv} />
            ))}
          </tbody>
        </table>
      </section>

      {d.timeline && <TimelineChart samples={d.timeline} />}

      <section className="card">
        <h3>Renders &amp; QC</h3>
        {d.renders.map((r) => (
          <details key={r.id} open={r.isCurrent}>
            <summary>
              v{r.version} · {r.renderer} · {r.status} {r.isCurrent && <span className="badge badge-ready">current</span>} {r.qcReport && <span className={`badge ${r.qcReport.status === "PASSED" ? "badge-qc-passed" : "badge-qc-needs_review"}`}>QC {r.qcReport.status}</span>}{" "}
              <span className="small muted">{r.renderMs ? `${(r.renderMs / 1000).toFixed(1)}s render` : "cached"}</span>
            </summary>
            {r.failureReason && <p className="small error">{r.failureReason}</p>}
            <ul>
              {r.qcReport?.issues.map((i, k) => (
                <li key={k} className={i.severity === "BLOCKING" ? "flag-blocking" : "flag-warning"}>
                  {i.check}: {i.message}
                </li>
              ))}
            </ul>
          </details>
        ))}
        {d.package && (
          <p className="small muted">
            Scene package v{d.package.version} · {d.package.contentHash.slice(0, 12)} · {d.package.storagePrefix}
          </p>
        )}
      </section>

      <section className="card">
        <h3>Jobs</h3>
        <table className="data-table">
          <tbody>
            {d.jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.type}</td>
                <td>
                  <span className={`badge badge-job-${j.status.toLowerCase()}`}>{j.status}</span> {j.status === "PROCESSING" && `${j.progress}%`}
                </td>
                <td className="small">{j.queue}</td>
                <td className="small">{[j.provider, j.model, j.gpuWorkerId].filter(Boolean).join(" · ")}</td>
                <td className="small">{j.durationMs ? `${(j.durationMs / 1000).toFixed(1)}s` : ""}</td>
                <td className="small error">{j.error}</td>
                <td>
                  {["PENDING", "PROCESSING", "RETRYING"].includes(j.status) && (
                    <button type="button" className="secondary" disabled={busy} onClick={() => run(() => productionApi.cancelJob(j.id), "Cancellation requested")}>
                      Cancel
                    </button>
                  )}
                  {["FAILED", "CANCELLED"].includes(j.status) && (
                    <button type="button" disabled={busy} onClick={() => run(() => productionApi.retryJob(j.id), "Retry queued")}>
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

function LayerRow({ l, busy, run, ov, setOv }: { l: InspectorLayer; busy: boolean; run: (fn: () => Promise<unknown>, ok: string) => Promise<void>; ov: ShotOverrides; setOv: (f: (o: ShotOverrides) => ShotOverrides) => void }) {
  const a = l.asset;
  const v = l.version;
  const layerOv = ov.layers?.[l.layerKey] ?? {};
  const setLayer = (patch: Record<string, unknown>) => setOv((o) => ({ ...o, layers: { ...o.layers, [l.layerKey]: { ...o.layers?.[l.layerKey], ...patch } } }));
  return (
    <tr>
      <td>
        <strong>{l.name}</strong>
        <div className="small muted">
          {l.kind.toLowerCase()} · {l.layerKey}
          {l.expression && ` · ${l.expression}`}
          {l.pose && ` · ${l.pose}`}
          {l.silhouette && " · silhouette"}
        </div>
      </td>
      <td>
        {a?.url && a.kind !== "RIG" ? <img src={a.url} alt="" className="asset-thumb" /> : <span className="small">{a?.kind === "RIG" ? "cut-out rig" : "—"}</span>}
        {l.depthUrl && <img src={l.depthUrl} alt="depth" className="asset-thumb" title="depth map" />}
        <div>
          {a && <span className={`badge badge-asset-${a.status.toLowerCase()}`}>{a.status}</span>}
          {a?.isPlaceholder && a.status !== "APPROVED" && <span className="badge badge-sensitive">placeholder</span>}
          {l.reuseDecision && <span className="badge">{l.reuseDecision}</span>}
        </div>
        {a?.failureReason && <div className="small error">{a.failureReason}</div>}
      </td>
      <td>
        <input type="range" min={0} max={1} step={0.01} value={layerOv.depth ?? l.depth} onChange={(e) => setLayer({ depth: Number(e.target.value) })} />
        <div className="small">{(layerOv.depth ?? l.depth).toFixed(2)}</div>
      </td>
      <td className="small">
        {v ? (
          <>
            {v.modelId} ({v.generator}) v{v.version}
            <div>
              {v.license} · seed {v.seed}
            </div>
            {v.licenceVerdict && <span className={`badge ${v.licenceVerdict.productionAllowed ? "badge-qc-passed" : "badge-qc-needs_review"}`}>{v.licenceVerdict.status}</span>}
          </>
        ) : (
          "—"
        )}
      </td>
      <td>
        {a && (
          <div className="action-row wrap">
            <button type="button" disabled={busy || !["READY", "APPROVED"].includes(a.status) || a.status === "APPROVED"} onClick={() => run(() => productionApi.approveAsset(a.id), `Approved ${a.name}`)}>
              Approve
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => run(() => productionApi.regenerateAsset(a.id), `Regenerating ${a.name} (all shots using it update)`)}>
              Regenerate
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt("Why reject this asset? (a new one will be generated)");
                if (reason) void run(() => productionApi.rejectAsset(a.id, reason), "Rejected");
              }}
            >
              Reject
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label>
      {label} <span className="small muted">{value.toFixed(step < 0.05 ? 3 : 2)}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/** Camera and focus curves over the shot (sampled from the procedural timeline). */
function TimelineChart({ samples }: { samples: TimelineSample[] }) {
  const W = 640;
  const H = 160;
  const dur = samples[samples.length - 1]?.t || 1;
  const charKey = Object.keys(samples[0]?.characters ?? {})[0];
  const series = useMemo(
    () => [
      { name: "camera zoom", color: "#1e3a5f", values: samples.map((s) => s.camera.zoom) },
      { name: "camera x", color: "#b45309", values: samples.map((s) => s.camera.x) },
      { name: "focus depth", color: "#047857", values: samples.map((s) => s.focusDepth) },
      ...(charKey ? [{ name: `${charKey} blink`, color: "#9333ea", values: samples.map((s) => s.characters[charKey].blink) }] : []),
    ],
    [samples, charKey],
  );
  return (
    <section className="card">
      <h3>Animation timeline</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="timeline-chart">
        {series.map((se) => {
          const lo = Math.min(...se.values);
          const hi = Math.max(...se.values);
          const span = hi - lo || 1;
          const pts = samples.map((s, i) => `${(s.t / dur) * (W - 10) + 5},${H - 10 - ((se.values[i] - lo) / span) * (H - 20)}`).join(" ");
          return <polyline key={se.name} points={pts} fill="none" stroke={se.color} strokeWidth={2} />;
        })}
      </svg>
      <div className="chip-row small">
        {series.map((se) => (
          <span key={se.name} className="chip" style={{ borderColor: se.color }}>
            {se.name}: {Math.min(...se.values).toFixed(3)} → {Math.max(...se.values).toFixed(3)}
          </span>
        ))}
      </div>
    </section>
  );
}
