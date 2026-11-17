import { useEffect, useMemo, useState } from "react";
import { NoStoryboard } from "../components/NoStoryboard";
import { Button, Card, ErrorNote, Field, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useScenes } from "../hooks/useScenes";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { Animation, Character, SceneJson } from "../types";

interface Presets {
  camera_presets: string[];
  facial_poses: string[];
}

export function AnimationStudio() {
  const { story, refresh, can } = useStudio();
  const { scenes, hasBoard } = useScenes();
  const characters = useLoad(() => api.get<Character[]>("/characters"), []);
  const animations = useLoad(() => api.get<Animation[]>("/animations"), []);
  const presets = useLoad(() => api.get<Presets>("/library/presets"), []);
  const [sceneId, setSceneId] = useState("");
  const [shotIndex, setShotIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [shown, setShown] = useState(0);
  const [draft, setDraft] = useState<SceneJson | null>(null);
  const [newAction, setNewAction] = useState({ character_id: "", animation: "", start: "0.5" });
  const [run, busy, error] = useAction();

  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];
  useEffect(() => {
    if (scene) setDraft(structuredClone(scene.scene_json));
  }, [scene?.id, story?.current_version]); // eslint-disable-line react-hooks/exhaustive-deps
  const shot = draft?.shots[Math.min(shotIndex, (draft?.shots.length ?? 1) - 1)];
  const offset = useMemo(() => (draft ? draft.shots.slice(0, shotIndex).reduce((t, s) => t + s.duration_seconds, 0) : 0), [draft, shotIndex]);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(time), 250);        // do not request a still for every slider step
    return () => window.clearTimeout(id);
  }, [time]);

  if (!story || !hasBoard) return <NoStoryboard />;
  if (!scene || !draft || !shot) return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(scene.scene_json);
  const rigOf = (cid: string) => characters.data?.find((c) => c.id === cid)?.rig_template;
  const clipsFor = (cid: string) => animations.data?.filter((a) => a.rigs.includes(rigOf(cid) ?? "")) ?? [];
  const edit = (fn: (s: SceneJson) => void) => setDraft((d) => { const copy = structuredClone(d!); fn(copy); return copy; });
  const save = () => run(async () => { await api.patch(`/scenes/${scene.id}`, { scene_json: draft }); await refresh(); });

  return (
    <>
      <h1 className="text-2xl font-bold">Animation Studio</h1>
      <Card>
        <div className="flex flex-wrap gap-3">
          <Field label="Scene">
            <select className={inputClass} value={scene.id} onChange={(e) => { setSceneId(e.target.value); setShotIndex(0); setTime(0); }}>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  Scene {s.scene_number}: {s.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Shot">
            <select className={inputClass} value={shotIndex} onChange={(e) => { setShotIndex(Number(e.target.value)); setTime(0); }}>
              {draft.shots.map((s, i) => (
                <option key={s.shot_id} value={i}>
                  {i + 1}. {s.description.slice(0, 40) || s.shot_id}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-[1fr_22rem]">
        <Card title="Preview">
          <img className="w-full rounded-lg border border-line" alt="Still of the shot at the chosen time" data-testid="animation-still"
               src={media(`/api/v1/scenes/${scene.id}/frame?t=${(offset + shown).toFixed(2)}&width=800&v=${story.current_version}`)} />
          <label className="mt-3 block text-sm">
            <span className="font-medium">Time in shot: {time.toFixed(1)} s of {shot.duration_seconds.toFixed(1)} s</span>
            <input type="range" className="w-full" min={0} max={Math.max(0, shot.duration_seconds - 0.05)} step={0.1} value={time} onChange={(e) => setTime(Number(e.target.value))} />
          </label>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" onClick={() => setTime((t) => Math.max(0, t - 0.5))}>−0.5 s</Button>
            <Button variant="ghost" onClick={() => setTime((t) => Math.min(shot.duration_seconds - 0.05, t + 0.5))}>+0.5 s</Button>
            <span className="self-center text-xs text-stone-500">{dirty ? "Showing the saved version; save to see your changes." : "Stills come from the fast compositor; render a preview for motion."}</span>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Camera movement">
            <select aria-label="Camera preset" className={inputClass} value={shot.camera.preset} onChange={(e) => edit((s) => { s.shots[shotIndex].camera = { ...s.shots[shotIndex].camera, preset: e.target.value }; })}>
              {presets.data?.camera_presets.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select aria-label="Camera target" className={`${inputClass} mt-2`} value={shot.camera.target ?? ""} onChange={(e) => edit((s) => { s.shots[shotIndex].camera = { ...s.shots[shotIndex].camera, target: e.target.value || null }; })}>
              <option value="">No target</option>
              {shot.characters.map((c) => (
                <option key={c.character_id} value={c.character_id}>
                  Frame {c.character_id}
                </option>
              ))}
            </select>
          </Card>
          {shot.characters.map((c, ci) => (
            <Card key={c.character_id} title={c.character_id}>
              <div className="flex gap-3">
                <img src={media(`/api/v1/media/assets/character/${c.character_id}/expressions/${c.expression}.png`)} alt={`${c.character_id}, ${c.expression}`} className="h-20 w-20 rounded-lg border border-line object-contain" />
                <div className="flex-1 space-y-2 text-sm">
                  <Field label="Expression">
                    <select className={inputClass} value={c.expression} onChange={(e) => edit((s) => { s.shots[shotIndex].characters[ci].expression = e.target.value; })}>
                      {presets.data?.facial_poses.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <p className="text-xs text-stone-500">
                    Pose/state: {c.state} · facing {c.facing}
                  </p>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {shot.actions.filter((a) => a.character_id === c.character_id).map((a) => (
                  <li key={a.action_id} className="flex items-center gap-2">
                    <code>{a.animation}</code>
                    <span className="text-xs text-stone-500">at {a.start_seconds}s{a.duration_seconds ? ` for ${a.duration_seconds}s` : ""}</span>
                    <button className="ml-auto text-xs text-red-700 underline" onClick={() => edit((s) => { s.shots[shotIndex].actions = s.shots[shotIndex].actions.filter((x) => x.action_id !== a.action_id); })}>
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {can("producer") && (
            <Card title="Add an animation">
              <div className="space-y-2">
                <select aria-label="Character for the new animation" className={inputClass} value={newAction.character_id} onChange={(e) => setNewAction({ ...newAction, character_id: e.target.value, animation: "" })}>
                  <option value="">Character…</option>
                  {shot.characters.map((c) => (
                    <option key={c.character_id}>{c.character_id}</option>
                  ))}
                </select>
                <select aria-label="Animation" className={inputClass} value={newAction.animation} onChange={(e) => setNewAction({ ...newAction, animation: e.target.value })}>
                  <option value="">Animation…</option>
                  {clipsFor(newAction.character_id).map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
                <Field label="Start (seconds)">
                  <input className={inputClass} type="number" min={0} step={0.1} value={newAction.start} onChange={(e) => setNewAction({ ...newAction, start: e.target.value })} />
                </Field>
                <Button variant="ghost" disabled={!newAction.character_id || !newAction.animation}
                        onClick={() => edit((s) => { s.shots[shotIndex].actions.push({ action_id: `manual_${Date.now().toString(36)}`, character_id: newAction.character_id, animation: newAction.animation, start_seconds: Number(newAction.start), duration_seconds: null }); })}>
                  Add to shot
                </Button>
              </div>
            </Card>
          )}
          <ErrorNote message={error} />
          {can("producer") && (
            <Button disabled={busy || !dirty} onClick={save}>
              Save changes
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
