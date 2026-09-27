import { Fragment, useState } from "react";
import { DialogueLine, LanguageWorkspace, StudioScene, studioApi, Workspace } from "../../api/studio";
import type { RunAction } from "./StudioStoryPage";

interface TabProps {
  ws: Workspace;
  busy: boolean;
  run: RunAction;
}

const VERIFICATION = ["VERIFIED", "REPORTED", "ALLEGED", "UNVERIFIED", "UNKNOWN"] as const;

export function FactsTab({ ws, busy, run }: TabProps) {
  const [filter, setFilter] = useState("");
  const facts = ws.facts.filter((f) => !filter || f.type === filter);
  const types = [...new Set(ws.facts.map((f) => f.type))];
  return (
    <section className="card">
      <h2>Fact check</h2>
      <p className="muted">
        REPORTED = stated by the publication · ALLEGED = accusation not proven in court · UNVERIFIED = claim by an interested party · VERIFIED = checked by an editor. Only an editor can
        mark a fact VERIFIED.
      </p>
      <label>
        Type:
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Fact</th>
            <th>Attributed to</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {facts.map((f) => (
            <tr key={f.id}>
              <td>
                {f.type}
                {f.isKeyFact && <span className="badge">key</span>}
                {f.statementType && <div className="muted small">{f.statementType}</div>}
              </td>
              <td>{f.value}</td>
              <td>{f.attributedTo ?? "—"}</td>
              <td>
                <select
                  disabled={busy}
                  value={f.verificationStatus}
                  onChange={(e) => run(() => studioApi.updateFact(ws.story.id, f.id, { verificationStatus: e.target.value }), "Fact updated")}
                >
                  {VERIFICATION.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                {f.adminEdited && <span className="badge">edited</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function CharactersTab({ ws, busy, run }: TabProps) {
  const voiceFor = (key: string) => ws.assignments.find((a) => a.speakerKey === key);
  const narrator = voiceFor("NARRATOR");
  const VoiceSelect = ({ speakerKey }: { speakerKey: string }) => (
    <select
      disabled={busy}
      value={voiceFor(speakerKey)?.voice.code ?? ""}
      onChange={(e) => run(() => studioApi.assignVoice(ws.story.id, speakerKey, e.target.value), `Voice for ${speakerKey} locked to ${e.target.value}`)}
    >
      <option value="" disabled>
        —
      </option>
      {ws.voices.map((v) => (
        <option key={v.code} value={v.code} disabled={speakerKey !== "NARRATOR" && v.code === narrator?.voice.code}>
          {v.code} — {v.label}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <section className="card">
        <h2>Narrator</h2>
        <VoiceSelect speakerKey="NARRATOR" />
        <p className="muted">The narrator's voice is never given to a character. Changing a voice sends the story back to admin review; only affected audio is regenerated.</p>
      </section>
      <section className="card">
        <h2>Characters</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Shown as</th>
              <th>Role</th>
              <th>Gender / age</th>
              <th>Appearance (fixed for the story)</th>
              <th>Voice</th>
            </tr>
          </thead>
          <tbody>
            {ws.characters.map((c) => (
              <tr key={c.id}>
                <td>{c.key}</td>
                <td>
                  {c.displayName}
                  {c.isMinor && <span className="badge badge-sensitive">minor — never named or drawn</span>}
                  {c.anonymized && !c.isMinor && <span className="badge">anonymised</span>}
                  {c.isOfficial && <span className="badge">official</span>}
                  {c.speaks && <span className="badge">quoted</span>}
                </td>
                <td>{c.role}</td>
                <td>
                  <select disabled={busy} value={c.gender} onChange={(e) => run(() => studioApi.updateCharacter(ws.story.id, c.id, { gender: e.target.value }), "Character updated")}>
                    {["MALE", "FEMALE", "UNKNOWN"].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <select disabled={busy || c.isMinor} value={c.ageGroup} onChange={(e) => run(() => studioApi.updateCharacter(ws.story.id, c.id, { ageGroup: e.target.value }), "Character updated")}>
                    {["CHILD", "YOUNG", "ADULT", "ELDERLY", "UNKNOWN"].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td className="small">{c.appearance ? `${c.appearance.clothing}; ${c.appearance.hair}` : "—"}</td>
                <td>
                  <VoiceSelect speakerKey={c.key} />
                  {voiceFor(c.key)?.lockedByAdmin && <span className="badge">locked</span>}
                  <div className="muted small">{voiceFor(c.key)?.reason}</div>
                </td>
              </tr>
            ))}
            {ws.characters.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No characters extracted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function ScenesTab({ ws, busy, run }: TabProps) {
  if (!ws.master) return <p className="muted">The master script is being generated…</p>;
  const total = ws.scenes.reduce((s, x) => s + x.durationSeconds, 0);
  return (
    <>
      <p>
        Master script v{ws.master.version} ({ws.master.provider}) · {ws.scenes.length} scenes · planned ~{Math.round(total)}s (real timing comes from the voices; never above 300s)
      </p>
      {ws.scenes.map((scene) => (
        <SceneCard key={scene.id} scene={scene} ws={ws} busy={busy} run={run} />
      ))}
    </>
  );
}

function SceneCard({ scene, ws, busy, run }: { scene: StudioScene } & TabProps) {
  const [editing, setEditing] = useState(false);
  const [narratorText, setNarratorText] = useState(scene.narratorText);
  const [onScreenText, setOnScreenText] = useState(scene.onScreenText ?? "");
  const [cameraDirection, setCameraDirection] = useState(scene.cameraDirection);
  const [background, setBackground] = useState(scene.background);
  const [dialogue, setDialogue] = useState<DialogueLine[]>(scene.dialogue);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <section className={`card scene scene-${scene.safetyLevel.toLowerCase()}`}>
      <div className="scene-grid">
        <div>
          {scene.asset?.url ? <img className="scene-thumb" src={scene.asset.url} alt={`Scene ${scene.sceneNumber}`} /> : <div className="scene-thumb placeholder-thumb">no image yet</div>}
          {scene.asset?.isPlaceholder && <div className="muted small">placeholder art</div>}
          <button disabled={busy} onClick={() => run(() => studioApi.regenerateVisual(ws.story.id, scene.id), `Regenerating visual for scene ${scene.sceneNumber}`)}>
            Regenerate visual
          </button>
        </div>
        <div>
          <h3>
            Scene {scene.sceneNumber} · {scene.durationSeconds}s · <span className={`badge badge-safety-${scene.safetyLevel.toLowerCase()}`}>{scene.safetyLevel}</span>
          </h3>
          <p className="muted small">
            {scene.location} · {scene.timeOfDay} · tone {scene.emotionalTone} · camera {scene.cameraDirection} · transition {scene.transition} · ambience {scene.audioRequirements?.ambient}
            {scene.characters.length > 0 && ` · characters ${scene.characters.join(", ")}`}
          </p>
          {scene.safetyReasons.length > 0 && <p className="flag-warning small">Safety: {scene.safetyReasons.join(", ")}</p>}
          {scene.visualPrompt?.isSubstitute && <p className="flag-warning small">Visual replaced: {scene.visualPrompt.substituteReason}. Narration is unchanged.</p>}
          {editing ? (
            <>
              <label>
                Narration
                <textarea rows={4} value={narratorText} onChange={(e) => setNarratorText(e.target.value)} />
              </label>
              {dialogue.map((d, i) => (
                <label key={i}>
                  {d.speakerKey} ({d.statementType})
                  <textarea rows={2} value={d.text} onChange={(e) => setDialogue(dialogue.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                </label>
              ))}
              <label>
                On-screen text
                <input value={onScreenText} onChange={(e) => setOnScreenText(e.target.value)} maxLength={120} />
              </label>
              <label>
                Background
                <input value={background} onChange={(e) => setBackground(e.target.value)} />
              </label>
              <label>
                Camera direction
                <input value={cameraDirection} onChange={(e) => setCameraDirection(e.target.value)} />
              </label>
              <div className="action-row">
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() => studioApi.editScene(ws.story.id, scene.id, { narratorText, dialogue, onScreenText: onScreenText || undefined, cameraDirection, background }), `Scene ${scene.sceneNumber} saved — only this scene is re-localised`).then(() =>
                      setEditing(false)
                    )
                  }
                >
                  Save scene
                </button>
                <button type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{scene.narratorText}</p>
              {scene.dialogue.map((d, i) => (
                <p key={i} className="dialogue">
                  <strong>{d.speakerKey}</strong> <span className="badge">{d.statementType}</span> “{d.text}”
                </p>
              ))}
              {scene.onScreenText && <p className="muted">On screen: {scene.onScreenText}</p>}
              <div className="action-row">
                <button onClick={() => setEditing(true)}>Edit scene</button>
                <button type="button" onClick={() => setShowPrompt(!showPrompt)}>
                  {showPrompt ? "Hide" : "Show"} visual prompt
                </button>
              </div>
              {showPrompt && scene.visualPrompt && (
                <div className="small">
                  <p>
                    <strong>Prompt:</strong> {scene.visualPrompt.prompt}
                  </p>
                  <p className="muted">
                    <strong>Excluded:</strong> {scene.visualPrompt.negativePrompt}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function LanguagesTab({ ws, busy, run }: TabProps) {
  const [lang, setLang] = useState(ws.languages[0]?.languageCode ?? "");
  const current = ws.languages.find((l) => l.languageCode === lang);
  return (
    <>
      <nav className="tabs">
        {ws.languages.map((l) => (
          <button key={l.languageCode} type="button" className={l.languageCode === lang ? "tab tab-active" : "tab"} onClick={() => setLang(l.languageCode)}>
            {l.languageCode}
            {l.script?.content.untranslated ? " (untranslated)" : ""}
          </button>
        ))}
      </nav>
      {current && <LanguagePanel l={current} ws={ws} busy={busy} run={run} />}
    </>
  );
}

function LanguagePanel({ l, ws, busy, run }: { l: LanguageWorkspace } & TabProps) {
  const [editScene, setEditScene] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ narratorText: string; dialogue: string[]; onScreenText: string }>({ narratorText: "", dialogue: [], onScreenText: "" });
  const flags = l.script?.lintFlags ?? [];
  const placeholders = l.segments.filter((s) => s.isPlaceholder).length;

  return (
    <>
      <section className="card">
        <h2>
          {l.languageCode} script {l.script ? `v${l.script.version} (${l.script.provider}, ~${l.script.estimatedDurationSeconds}s, ${l.script.status})` : "— generating…"}
        </h2>
        {l.script?.content.untranslated && <p className="flag-blocking">No translation provider is configured, so this is the master-language text. Add ANTHROPIC_API_KEY or GOOGLE_TRANSLATE_API_KEY.</p>}
        {placeholders > 0 && <p className="flag-warning">{placeholders} line(s) use silent placeholder audio — configure a voice provider for {l.languageCode} (Voices page).</p>}
        <div className="action-row">
          <button disabled={busy} onClick={() => run(() => studioApi.regenerateLanguage(ws.story.id, l.languageCode), `Re-localising changed scenes for ${l.languageCode}`)}>
            Update script
          </button>
          <button disabled={busy} onClick={() => confirm("Re-translate every scene? Hand edits in this language will be replaced.") && run(() => studioApi.regenerateLanguage(ws.story.id, l.languageCode, true), `Re-translating all of ${l.languageCode}`)}>
            Re-translate all
          </button>
          <button disabled={busy} onClick={() => run(() => studioApi.regenerateVoice(ws.story.id, l.languageCode), `Voice generation queued for ${l.languageCode}`)}>
            Generate / update audio
          </button>
          <button disabled={busy} onClick={() => run(() => studioApi.rerender(ws.story.id, l.languageCode), `Re-render queued for ${l.languageCode}`)}>
            Re-render video
          </button>
        </div>
        {flags.length > 0 && (
          <ul>
            {flags.map((f, i) => (
              <li key={i} className={f.severity === "BLOCKING" ? "flag-blocking" : "flag-warning"}>
                [{f.severity}] {f.sceneNumber ? `scene ${f.sceneNumber}: ` : ""}
                {f.rule} {f.excerpt ? `“${f.excerpt}”` : ""} {f.suggestion ? `— ${f.suggestion}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {l.script?.content.scenes.map((s) => {
        const audio = l.segments.filter((g) => g.sceneNumber === s.sceneNumber);
        return (
          <section className="card" key={s.sceneNumber}>
            <h3>
              Scene {s.sceneNumber} {s.edited && <span className="badge">edited</span>}
            </h3>
            {editScene === s.sceneNumber ? (
              <>
                <textarea rows={4} value={draft.narratorText} onChange={(e) => setDraft({ ...draft, narratorText: e.target.value })} />
                {draft.dialogue.map((d, i) => (
                  <textarea key={i} rows={2} value={d} onChange={(e) => setDraft({ ...draft, dialogue: draft.dialogue.map((x, j) => (j === i ? e.target.value : x)) })} />
                ))}
                {s.onScreenText !== undefined && <input value={draft.onScreenText} onChange={(e) => setDraft({ ...draft, onScreenText: e.target.value })} />}
                <div className="action-row">
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => studioApi.editLanguageScene(ws.story.id, l.languageCode, s.sceneNumber, { narratorText: draft.narratorText, dialogue: draft.dialogue, onScreenText: draft.onScreenText || undefined }),
                        `Saved ${l.languageCode} scene ${s.sceneNumber} — no other language is touched`
                      ).then(() => setEditScene(null))
                    }
                  >
                    Save lines
                  </button>
                  <button type="button" onClick={() => setEditScene(null)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{s.narratorText}</p>
                {s.dialogue.map((d, i) => (
                  <p key={i} className="dialogue">
                    <strong>{d.speakerKey}</strong> “{d.text}”
                  </p>
                ))}
                {s.onScreenText && <p className="muted">On screen: {s.onScreenText}</p>}
                {audio.map((a) => (
                  <div key={a.id} className="audio-line small">
                    {a.speakerKey} · {a.voiceCode} · {a.provider}
                    {a.isPlaceholder ? " (placeholder)" : ""} · {a.durationSeconds.toFixed(1)}s <audio controls preload="none" src={a.url} />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ narratorText: s.narratorText, dialogue: s.dialogue.map((d) => d.text), onScreenText: s.onScreenText ?? "" });
                    setEditScene(s.sceneNumber);
                  }}
                >
                  Edit lines
                </button>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}

export function RendersTab({ ws }: TabProps) {
  const renders = [...ws.languages.filter((l) => l.render).map((l) => ({ render: l.render!, subtitles: l.subtitles, tracks: l.tracks, label: l.languageCode }))];
  if (ws.packageRender) renders.push({ render: ws.packageRender, subtitles: [], tracks: [], label: "multi-audio package" });
  if (renders.length === 0) return <p className="muted">No renders yet. Renders start after the script is approved and every scene has a visual.</p>;
  return (
    <div className="two-col">
      {renders.map(({ render, subtitles, tracks, label }) => (
        <section className="card" key={render.id}>
          <h3>
            {label} · v{render.version} · <span className={`badge badge-${render.status.toLowerCase()}`}>{render.status}</span>
          </h3>
          {render.status === "READY" && render.url && render.renderer !== "mock-manifest" ? (
            <video className="render-video" controls preload="metadata" poster={render.thumbnailUrl ?? undefined} src={render.url} />
          ) : render.renderer === "mock-manifest" ? (
            <p className="flag-warning">ffmpeg is not installed on the render worker — this is a manifest, not a video.</p>
          ) : null}
          {render.failureReason && <p className="error">{render.failureReason}</p>}
          <p className="muted small">
            {render.durationSeconds?.toFixed(1)}s · {render.width}×{render.height} @ {render.fps}fps · {render.renderer}
          </p>
          <div className="action-row">
            {render.url && (
              <a className="button-link" href={render.url} download>
                MP4
              </a>
            )}
            {subtitles.map((s) => (
              <a key={s.format} className="button-link" href={s.url} download>
                {s.format}
              </a>
            ))}
          </div>
          {tracks.length > 0 && (
            <details>
              <summary>Separate audio tracks</summary>
              {tracks.map((t) => (
                <div key={t.trackType} className="audio-line small">
                  {t.trackType} <audio controls preload="none" src={t.url} />
                </div>
              ))}
            </details>
          )}
        </section>
      ))}
    </div>
  );
}

export function JobsTab({ ws, busy, run }: TabProps) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="card">
      <h2>Generation jobs</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ws.jobs.map((j) => (
            <Fragment key={j.id}>
              <tr>
                <td>
                  {j.type}
                  {j.languageCode ? ` · ${j.languageCode}` : ""}
                  {j.error && <div className="error small">{j.error}</div>}
                </td>
                <td>
                  <span className={`badge badge-job-${j.status.toLowerCase()}`}>{j.status}</span>
                </td>
                <td>
                  {j.attempts}/{j.maxAttempts}
                </td>
                <td className="muted small">{new Date(j.createdAt).toLocaleTimeString()}</td>
                <td>
                  <button type="button" onClick={() => setOpen(open === j.id ? null : j.id)}>
                    Logs
                  </button>
                  {j.status === "FAILED" && (
                    <button disabled={busy} onClick={() => run(() => studioApi.retryJob(j.id), `Retrying ${j.type}`)}>
                      Retry
                    </button>
                  )}
                </td>
              </tr>
              {open === j.id && (
                <tr>
                  <td colSpan={5}>
                    <pre className="logs">{j.logs.map((l) => `${new Date(l.createdAt).toLocaleTimeString()} [${l.level}] ${l.message}`).join("\n")}</pre>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function VersionsTab({ ws }: TabProps) {
  const [snapshot, setSnapshot] = useState<string | null>(null);
  return (
    <section className="card">
      <h2>Version history</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>What</th>
            <th>Version</th>
            <th>Reason</th>
            <th>When</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ws.versions.map((v) => (
            <tr key={v.id}>
              <td>
                {v.entityType}
                {v.languageCode ? ` · ${v.languageCode}` : ""}
              </td>
              <td>v{v.version}</td>
              <td>{v.reason}</td>
              <td className="muted small">{new Date(v.createdAt).toLocaleString()}</td>
              <td>
                <button type="button" onClick={() => studioApi.version(ws.story.id, v.id).then((r) => setSnapshot(JSON.stringify(r.version.snapshot, null, 2)))}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {snapshot && <pre className="logs">{snapshot}</pre>}
    </section>
  );
}
