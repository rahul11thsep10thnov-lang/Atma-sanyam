import { useState } from "react";
import { NoStoryboard } from "../components/NoStoryboard";
import { Badge, Button, Card, ErrorNote, Field, Progress, inputClass, seconds } from "../components/ui";
import { describe, useLoad } from "../hooks/useAsync";
import { useScenes, waitForJob } from "../hooks/useScenes";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { Environment, RenderJob, Scene } from "../types";

export function Storyboard() {
  const { story, refresh, can } = useStudio();
  const { scenes, hasBoard, error } = useScenes();
  const environments = useLoad(() => api.get<Environment[]>("/environments"), []);
  if (!story || !hasBoard) return <NoStoryboard />;
  const total = scenes.reduce((sum, s) => sum + s.duration, 0);
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold">Storyboard</h1>
        <span className="text-sm text-stone-600">
          {scenes.length} scenes · {seconds(total)}
        </span>
      </div>
      <ErrorNote message={error} />
      {scenes.map((scene) => (
        <SceneCard key={`${scene.id}-${story.current_version}`} scene={scene} environments={environments.data ?? []} onChanged={refresh} canEdit={can("producer")} canApprove={can("reviewer")} version={story.current_version} />
      ))}
    </>
  );
}

function SceneCard({ scene, environments, onChanged, canEdit, canApprove, version }: { scene: Scene; environments: Environment[]; onChanged: () => Promise<void>; canEdit: boolean; canApprove: boolean; version: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: scene.title, time_of_day: scene.time_of_day, weather: scene.weather, environment_id: scene.environment_id });
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<RenderJob | null>(null);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    act(async () => {
      const changes: Record<string, unknown> = {};
      (Object.keys(draft) as (keyof typeof draft)[]).forEach((k) => draft[k] !== scene[k] && (changes[k] = draft[k]));
      if (json.trim()) changes.scene_json = JSON.parse(json);
      if (Object.keys(changes).length) await api.patch(`/scenes/${scene.id}`, changes);
      setEditing(false);
    });

  const preview = async () => {
    setError(null);
    try {
      const started = await api.post<RenderJob>(`/scenes/${scene.id}/preview`);
      setJob(started);
      setJob(await waitForJob(started.id, setJob));
    } catch (e) {
      setError(describe(e));
    }
  };

  const clip = job?.outputs.find((o) => o.type === "preview");
  return (
    <Card
      title={
        <span>
          Scene {scene.scene_number}: {scene.title || scene.scene_id} <Badge>{scene.approval_status}</Badge>
        </span>
      }
      actions={
        <>
          {canEdit && <Button variant="ghost" onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</Button>}
          {canEdit && <Button variant="ghost" disabled={busy} onClick={() => act(() => api.post(`/scenes/${scene.id}/regenerate`))}>Regenerate</Button>}
          {canEdit && <Button disabled={job?.status === "queued" || job?.status === "running"} onClick={preview}>Preview</Button>}
          {canApprove && scene.approval_status !== "approved" && <Button variant="ghost" disabled={busy} onClick={() => act(() => api.patch(`/scenes/${scene.id}`, { approval_status: "approved" }))}>Approve</Button>}
          {canApprove && scene.approval_status !== "rejected" && <Button variant="danger" disabled={busy} onClick={() => act(() => api.patch(`/scenes/${scene.id}`, { approval_status: "rejected" }))}>Reject</Button>}
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[320px_1fr]" data-testid="scene-card">
        <div className="space-y-2">
          {clip ? (
            <video controls className="w-full rounded-lg border border-line" src={media(clip.url)} data-testid="scene-preview" />
          ) : (
            <img className="w-full rounded-lg border border-line" alt={`Still of scene ${scene.scene_number}`} src={media(`/api/v1/scenes/${scene.id}/frame?t=${Math.min(2, scene.duration / 2)}&width=480&v=${version}`)} />
          )}
          {job && !clip && (
            <div className="text-xs text-stone-600">
              Preview: <Badge>{job.status}</Badge>
              {(job.status === "running" || job.status === "queued") && <Progress value={job.progress} />}
              {job.error_message && <span className="text-red-700"> {job.error_message}</span>}
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="text-stone-600">{scene.description}</p>
          <p>
            <b>Duration</b> {seconds(scene.duration)} · <b>Shots</b> {scene.shot_count} · <b>Environment</b> <code>{scene.environment_id}</code> · {scene.time_of_day}, {scene.weather}
          </p>
          <p>
            <b>Characters</b> {scene.characters.length ? scene.characters.map((c) => <code key={c} className="mr-2">{c}</code>) : "none"}
          </p>
          <div>
            <b>Narration</b>
            <ul className="list-disc pl-5" lang="hi">
              {scene.narration.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
          {scene.dialogue.length > 0 && (
            <div>
              <b>Dialogue</b>
              <ul className="space-y-1" lang="hi">
                {scene.dialogue.map((d, i) => (
                  <li key={i}>
                    <code className="text-xs">{d.speaker}</code> {d.emotion !== "neutral" && <Badge tone="info">{d.emotion}</Badge>} “{d.text}”
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ErrorNote message={error} />
          {editing && (
            <div className="space-y-3 rounded-lg border border-line bg-paper p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Title">
                  <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </Field>
                <Field label="Environment">
                  <select className={inputClass} value={draft.environment_id} onChange={(e) => setDraft({ ...draft, environment_id: e.target.value })}>
                    {environments.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Time of day">
                  <select className={inputClass} value={draft.time_of_day} onChange={(e) => setDraft({ ...draft, time_of_day: e.target.value })}>
                    {["day", "morning", "sunset", "night", "overcast"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Weather">
                  <select className={inputClass} value={draft.weather} onChange={(e) => setDraft({ ...draft, weather: e.target.value })}>
                    {["clear", "windy", "rain"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <details>
                <summary className="cursor-pointer font-medium">Advanced: edit the scene definition (JSON)</summary>
                <textarea aria-label="Scene definition JSON" className={`${inputClass} mt-2 h-64 font-mono text-xs`} value={json || JSON.stringify(scene.scene_json, null, 1)} onChange={(e) => setJson(e.target.value)} />
              </details>
              <Button disabled={busy} onClick={save}>
                Save scene
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
