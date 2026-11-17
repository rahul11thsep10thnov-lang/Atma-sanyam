import { useEffect, useState } from "react";
import { NoStoryboard } from "../components/NoStoryboard";
import { Button, Card, ErrorNote, inputClass, seconds } from "../components/ui";
import { useAction } from "../hooks/useAsync";
import { useScenes } from "../hooks/useScenes";
import { useStudio } from "../hooks/useStudio";
import { api } from "../services/api";
import type { Scene, SceneJson, ShotJson } from "../types";

const LANE = "relative h-7 rounded bg-stone-100";

export function TimelineEditor() {
  const { story, refresh, can } = useStudio();
  const { scenes, hasBoard } = useScenes();
  if (!story || !hasBoard) return <NoStoryboard />;
  const total = scenes.reduce((t, s) => t + s.duration, 0) || 1;
  return (
    <>
      <h1 className="text-2xl font-bold">Timeline Editor</h1>
      <Card title={`Whole story: ${seconds(total)}`}>
        <div className="flex h-8 overflow-hidden rounded-lg border border-line text-xs">
          {scenes.map((s, i) => (
            <div key={s.id} title={`${s.title} (${seconds(s.duration)})`} style={{ width: `${(s.duration / total) * 100}%` }} className={`flex items-center justify-center truncate ${i % 2 ? "bg-amber-100" : "bg-amber-200"}`}>
              {s.scene_number}
            </div>
          ))}
        </div>
      </Card>
      {scenes.map((s) => (
        <SceneTimeline key={`${s.id}-${story.current_version}`} scene={s} editable={can("producer")} onSaved={refresh} />
      ))}
    </>
  );
}

function SceneTimeline({ scene, editable, onSaved }: { scene: Scene; editable: boolean; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState<SceneJson>(() => structuredClone(scene.scene_json));
  const [run, busy, error] = useAction();
  useEffect(() => setDraft(structuredClone(scene.scene_json)), [scene.scene_json]);
  const total = draft.shots.reduce((t, s) => t + s.duration_seconds, 0) || 1;
  const dirty = JSON.stringify(draft) !== JSON.stringify(scene.scene_json);
  const pct = (v: number) => `${(v / total) * 100}%`;
  let at = 0;
  const offsets = draft.shots.map((s) => { const o = at; at += s.duration_seconds; return o; });

  const setShot = (i: number, fn: (s: ShotJson) => void) => setDraft((d) => { const c = structuredClone(d); fn(c.shots[i]); return c; });

  return (
    <Card
      title={`Scene ${scene.scene_number}: ${scene.title} (${seconds(total)})`}
      actions={editable && dirty && <Button disabled={busy} onClick={() => run(async () => { await api.patch(`/scenes/${scene.id}`, { scene_json: draft }); await onSaved(); })}>Save timing</Button>}
    >
      <ErrorNote message={error} />
      <div className="space-y-1 text-xs" data-testid="timeline">
        <div className={LANE} aria-label="Shots">
          {draft.shots.map((s, i) => (
            <div key={s.shot_id} className="absolute top-0 flex h-full items-center overflow-hidden border-r border-white bg-amber-300 px-1" style={{ left: pct(offsets[i]), width: pct(s.duration_seconds) }} title={`${s.camera.preset}, ${s.duration_seconds}s`}>
              {i + 1} · {s.camera.preset}
            </div>
          ))}
        </div>
        <div className={LANE} aria-label="Speech">
          {draft.shots.map((s, i) => {
            const each = (s.duration_seconds - 0.4) / Math.max(1, s.dialogue.length);
            return s.dialogue.map((l, j) => (
              <div key={l.line_id} lang="hi" className={`absolute top-0.5 h-6 truncate rounded px-1 leading-6 ${l.speaker === "narrator" ? "bg-sky-200" : "bg-green-200"}`}
                   style={{ left: pct(offsets[i] + 0.3 + j * each), width: pct(Math.max(0.3, each - 0.1)) }} title={`${l.speaker}: ${l.text}`}>
                {l.speaker === "narrator" ? "" : `${l.speaker}: `}
                {l.text}
              </div>
            ));
          })}
        </div>
        <div className={LANE} aria-label="Actions">
          {draft.shots.map((s, i) =>
            s.actions.map((a) => (
              <div key={a.action_id} className="absolute top-0.5 h-6 truncate rounded bg-purple-200 px-1 leading-6" style={{ left: pct(offsets[i] + a.start_seconds), width: pct(a.duration_seconds ?? 1) }} title={`${a.character_id}: ${a.animation}`}>
                {a.animation}
              </div>
            )),
          )}
        </div>
        <div className={LANE} aria-label="Effects">
          {draft.shots.map((s, i) =>
            s.effects.map((e) => (
              <div key={e.effect_id} className="absolute top-0.5 h-6 truncate rounded bg-pink-200 px-1 leading-6" style={{ left: pct(offsets[i] + e.start_seconds), width: pct(Math.min(e.duration_seconds, s.duration_seconds - e.start_seconds)) }}>
                {e.type}
              </div>
            )),
          )}
        </div>
        <p className="pt-1 text-stone-500">Lanes: shots · speech (blue narration, green dialogue; placed evenly until audio is generated) · actions · effects.</p>
      </div>
      {editable && (
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {draft.shots.map((s, i) => (
            <label key={s.shot_id} className="text-xs">
              Shot {i + 1} length (s)
              <input type="number" min={0.5} step={0.25} className={inputClass} value={s.duration_seconds}
                     onChange={(e) => setShot(i, (shot) => { shot.duration_seconds = Math.max(0.5, Math.round(Number(e.target.value) * 24) / 24); })} />
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}
