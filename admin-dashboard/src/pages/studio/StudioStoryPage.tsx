import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { studioApi, Workspace } from "../../api/studio";
import { CharactersTab, FactsTab, JobsTab, LanguagesTab, RendersTab, ScenesTab, VersionsTab } from "./StudioSections";
import { ProductionTab } from "../production/ProductionTab";

const TABS = ["Overview", "Facts", "Characters & voices", "Master script", "Production", "Languages", "Renders", "Jobs", "Versions"] as const;
type Tab = (typeof TABS)[number];

export type RunAction = (fn: () => Promise<unknown>, success: string) => Promise<void>;

export function StudioStoryPage() {
  const { id } = useParams<{ id: string }>();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => studioApi.workspace(id!).then(setWs).catch((e) => setError(e.message)), [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while work is in flight so progress shows up without reloading.
  const running = ws?.jobs.some((j) => ["PENDING", "PROCESSING", "RETRYING"].includes(j.status)) ?? false;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [running, load]);

  const run: RunAction = async (fn, success) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(success);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!ws) return <p>{error ?? "Loading..."}</p>;
  const { story } = ws;

  return (
    <div>
      <p>
        <Link to="/studio">← Studio</Link>
      </p>
      <div className="page-header">
        <h1>{story.title}</h1>
        <div>
          <span className={`badge badge-${story.status.toLowerCase()}`}>{story.status}</span>{" "}
          <span className={`badge badge-qc-${story.qcStatus.toLowerCase()}`}>QC: {story.qcStatus}</span>{" "}
          {story.isSensitive && <span className="badge badge-sensitive">sensitive: {story.sensitiveTopics.join(", ")}</span>}
          {running && <span className="badge badge-approved">working…</span>}
        </div>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={t === tab ? "tab tab-active" : "tab"} onClick={() => setTab(t)}>
            {t}
            {t === "Jobs" && ws.jobs.some((j) => j.status === "FAILED") ? " ⚠" : ""}
          </button>
        ))}
      </nav>

      {message && <p className="info">{message}</p>}
      {error && <p className="error">{error}</p>}

      {tab === "Overview" && <OverviewTab ws={ws} busy={busy} run={run} />}
      {tab === "Facts" && <FactsTab ws={ws} busy={busy} run={run} />}
      {tab === "Characters & voices" && <CharactersTab ws={ws} busy={busy} run={run} />}
      {tab === "Master script" && <ScenesTab ws={ws} busy={busy} run={run} />}
      {tab === "Production" && <ProductionTab storyId={story.id} />}
      {tab === "Languages" && <LanguagesTab ws={ws} busy={busy} run={run} />}
      {tab === "Renders" && <RendersTab ws={ws} busy={busy} run={run} />}
      {tab === "Jobs" && <JobsTab ws={ws} busy={busy} run={run} />}
      {tab === "Versions" && <VersionsTab ws={ws} busy={busy} run={run} />}
    </div>
  );
}

function OverviewTab({ ws, busy, run }: { ws: Workspace; busy: boolean; run: RunAction }) {
  const { story } = ws;
  const [notes, setNotes] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const report = story.qcReport;
  const blocking = report?.issues.filter((i) => i.severity === "BLOCKING") ?? [];

  return (
    <>
      <section className="card">
        <h2>Workflow</h2>
        <ol className="workflow">
          {["DRAFT", "AI_REVIEW", "ADMIN_REVIEW", "APPROVED", "RENDERED", "PUBLISHED"].map((s) => (
            <li key={s} className={s === story.status ? "wf-current" : ""}>
              {s.replace("_", " ")}
            </li>
          ))}
        </ol>
        {story.status === "REJECTED" && <p className="error">Rejected: {story.rejectionReason ?? "no reason given"}</p>}
        <textarea placeholder="Review notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="action-row">
          <button disabled={busy || story.status !== "ADMIN_REVIEW"} onClick={() => run(() => studioApi.approve(story.id, notes), "Approved — generating voices, visuals and renders")}>
            Approve script → generate video
          </button>
          <button disabled={busy} onClick={() => run(() => studioApi.submitReview(story.id), "AI review queued")}>
            Re-run AI review
          </button>
          <button disabled={busy} className="danger" onClick={() => run(() => studioApi.reject(story.id, notes), "Story rejected")}>
            Reject
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Publish to the app</h2>
        {story.isSensitive && <p className="flag-warning">Sensitive story — it is never published automatically. Review the renders before publishing.</p>}
        {story.qcStatus !== "PASSED" && story.status === "RENDERED" && (
          <textarea placeholder="Override note (required because QC did not pass): why is this acceptable?" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
        )}
        <button disabled={busy || (story.status !== "RENDERED" && story.status !== "PUBLISHED")} onClick={() => run(() => studioApi.publish(story.id, overrideNote || undefined), "Published to the app feed")}>
          {story.status === "PUBLISHED" ? "Re-publish current renders" : "Publish"}
        </button>
        {story.publishedAt && <p className="muted">Published {new Date(story.publishedAt).toLocaleString()}</p>}
      </section>

      <section className="card">
        <h2>Quality check {report?.phase === "text" ? "(script stage)" : report?.phase === "final" ? "(final)" : ""}</h2>
        {!report ? (
          <p className="muted">Not run yet.</p>
        ) : (
          <>
            <div className="chip-row">
              {report.checks.map((c) => (
                <span key={c.name} className={`chip ${c.passed ? "chip-pass" : "chip-fail"}`}>
                  {c.passed ? "✓" : "✗"} {c.name.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <ul>
              {report.issues.map((i, n) => (
                <li key={n} className={i.severity === "BLOCKING" ? "flag-blocking" : "flag-warning"}>
                  [{i.severity}] {i.languageCode ? `${i.languageCode} ` : ""}
                  {i.sceneNumber ? `scene ${i.sceneNumber} ` : ""}— {i.message}
                </li>
              ))}
              {report.issues.length === 0 && <li className="info">No issues.</li>}
            </ul>
            {blocking.length > 0 && <p className="muted">{blocking.length} blocking issue(s) must be fixed or explicitly overridden before publishing.</p>}
          </>
        )}
      </section>

      <SettingsCard ws={ws} busy={busy} run={run} />
      <ArticleCard ws={ws} busy={busy} run={run} />

      {story.analysisSummary?.warnings && story.analysisSummary.warnings.length > 0 && (
        <section className="card">
          <h2>Analysis notes ({story.analysisSummary.provider})</h2>
          <ul>
            {story.analysisSummary.warnings.map((w, i) => (
              <li key={i} className="flag-warning">
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SettingsCard({ ws, busy, run }: { ws: Workspace; busy: boolean; run: RunAction }) {
  const { story, project } = ws;
  const [languages, setLanguages] = useState(story.languages.join(","));
  return (
    <section className="card">
      <h2>Settings</h2>
      <p>
        {story.format} · target {story.targetDurationSeconds}s · style {story.animationStyle} · narrator {story.narratorVoiceCode} · master language {story.masterLanguage}
        {project && ` · ${project.width}×${project.height} @ ${project.fps}fps · subtitles ${project.burnSubtitles ? "burned-in + files" : "files"}${project.multiAudioPackage ? " · multi-audio package" : ""}`}
      </p>
      <label>
        Output languages (comma-separated codes; adding one only generates that language)
        <input value={languages} onChange={(e) => setLanguages(e.target.value)} />
      </label>
      <div className="action-row">
        <button disabled={busy} onClick={() => run(() => studioApi.updateSettings(story.id, { languages: languages.split(",").map((s) => s.trim()).filter(Boolean) }), "Languages updated")}>
          Save languages
        </button>
        {project && (
          <>
            <button disabled={busy} onClick={() => run(() => studioApi.updateSettings(story.id, { burnSubtitles: !project.burnSubtitles }), "Subtitle setting updated")}>
              {project.burnSubtitles ? "Stop burning subtitles" : "Burn subtitles in"}
            </button>
            <button disabled={busy} onClick={() => run(() => studioApi.updateSettings(story.id, { multiAudioPackage: !project.multiAudioPackage }), "Package setting updated")}>
              {project.multiAudioPackage ? "Disable multi-audio package" : "Enable multi-audio package"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function ArticleCard({ ws, busy, run }: { ws: Workspace; busy: boolean; run: RunAction }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(ws.article?.rawText ?? "");
  if (!ws.article) return null;
  return (
    <section className="card">
      <h2>Article v{ws.article.version}</h2>
      {editing ? (
        <>
          <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="action-row">
            <button disabled={busy} onClick={() => run(() => studioApi.updateArticle(ws.story.id, { articleText: text }), "Article saved — re-analysing").then(() => setEditing(false))}>
              Save &amp; re-analyse
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <pre className="article-text">{ws.article.cleanedText ?? ws.article.rawText}</pre>
          <div className="action-row">
            <button onClick={() => setEditing(true)}>Edit article</button>
            <button disabled={busy} onClick={() => run(() => studioApi.reanalyze(ws.story.id), "Re-analysis queued")}>
              Re-analyse
            </button>
            <button disabled={busy} onClick={() => run(() => studioApi.regenerateMaster(ws.story.id), "Master script regeneration queued")}>
              Regenerate master script
            </button>
          </div>
        </>
      )}
    </section>
  );
}
