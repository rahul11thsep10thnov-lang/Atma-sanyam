import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productionApi, ProductionView, ShotSummary } from "../../api/production";

const ACTIVE = new Set(["PLANNED", "GENERATING_ASSETS", "ASSETS_READY", "DEPTH_READY", "SHOT_READY", "RENDERING", "QC_PENDING"]);

/** Story → Episode → Scene → Shot board for cinematic stories. */
export function ProductionTab({ storyId }: { storyId: string }) {
  const [view, setView] = useState<ProductionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => productionApi.production(storyId).then(setView).catch((e) => setError(e.message)), [storyId]);
  useEffect(() => {
    load();
  }, [load]);
  const busy = view?.scenes.some((s) => s.shots.some((sh) => ACTIVE.has(sh.status))) ?? false;
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [busy, load]);

  if (error) return <p className="error">{error}</p>;
  if (!view) return <p>Loading…</p>;
  if (view.story.productionMode !== "CINEMATIC_25D") return <p className="info">This story uses the classic still-image renderer. Cinematic production applies to stories created in CINEMATIC_25D mode.</p>;
  if (!view.episode) return <p className="info">Shots are planned when the story is approved.</p>;
  const shots = view.scenes.flatMap((s) => s.shots);
  const rendered = shots.filter((s) => s.render).length;
  const placeholders = shots.reduce((n, s) => n + s.placeholders, 0);
  const ep = view.episode;

  return (
    <div>
      <div className="stat-grid">
        <Stat label="Shots" value={shots.length} />
        <Stat label="Rendered" value={`${rendered}/${shots.length}`} />
        <Stat label="QC failed" value={shots.filter((s) => s.status === "QC_FAILED").length} />
        <Stat label="Placeholder layers" value={placeholders} />
        <Stat label="Episode" value={ep.status} />
        <Stat label="Profile" value={`${ep.renderProfile.width}×${ep.renderProfile.height}@${ep.renderProfile.fps}`} />
      </div>
      {placeholders > 0 && (
        <p className="info small">
          Placeholder art (offline procedural generator) blocks publishing until an editor approves it or a licence-cleared local model regenerates it — see the <Link to={`/production/assets?storyId=${storyId}&placeholder=true`}>asset library</Link>.
        </p>
      )}
      {ep.masterVisualUrl && (
        <details className="card">
          <summary>Master visual ({ep.durationSeconds?.toFixed(1)}s, shared by every language)</summary>
          <video className="render-video portrait" src={ep.masterVisualUrl} controls preload="metadata" />
        </details>
      )}
      {view.scenes.map((sc) => (
        <section key={sc.id} className={`card scene-${sc.safetyLevel.toLowerCase()}`}>
          <h3>
            Scene {sc.sceneNumber} · {sc.location} · {sc.timeOfDay} <span className={`badge badge-safety-${sc.safetyLevel.toLowerCase()}`}>{sc.safetyLevel}</span>
          </h3>
          <p className="small muted">{sc.narratorText}</p>
          <div className="shot-strip">
            {sc.shots.map((sh) => (
              <ShotCard key={sh.id} shot={sh} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ShotCard({ shot }: { shot: ShotSummary }) {
  return (
    <Link to={`/production/shots/${shot.id}`} className="shot-card">
      {shot.render?.thumbnailUrl ? <img src={shot.render.thumbnailUrl} alt="" className="shot-thumb" /> : <div className="shot-thumb placeholder-thumb">{shot.status.replace(/_/g, " ").toLowerCase()}</div>}
      <div className="shot-meta">
        <strong>#{shot.globalNumber}</strong> {shot.shotType.replace(/_/g, " ").toLowerCase()} · {shot.cameraMovement.replace(/_/g, " ")}
        <div className="small">{(shot.renderDurationSeconds ?? shot.durationSeconds).toFixed(1)}s · {shot.selectedRenderer}</div>
        <div>
          <span className={`badge badge-shot-${shot.status.toLowerCase()}`}>{shot.status}</span>
          {shot.render?.qcStatus && <span className={`badge ${shot.render.qcStatus === "PASSED" ? "badge-qc-passed" : "badge-qc-needs_review"}`}>QC {shot.render.qcStatus}</span>}
          {shot.motionDecision === "LOCAL_I2V_REQUIRED" && <span className="badge">I2V</span>}
          {shot.placeholders > 0 && <span className="badge badge-sensitive">{shot.placeholders} placeholder</span>}
          {shot.hasOverrides && <span className="badge">edited</span>}
        </div>
      </div>
    </Link>
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
