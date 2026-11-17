import { useState } from "react";
import { NoStoryboard } from "../components/NoStoryboard";
import { Badge, Button, Card, Empty, ErrorNote, Progress, seconds } from "../components/ui";
import { useAction, useLoad, usePoll } from "../hooks/useAsync";
import { useScenes } from "../hooks/useScenes";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { RenderJob } from "../types";

export function RenderManager() {
  const { story, refresh, can } = useStudio();
  const { scenes, hasBoard } = useScenes();
  const jobs = useLoad<RenderJob[]>(() => (story ? api.get<RenderJob[]>(`/render-jobs?story_id=${story.id}`) : Promise.resolve([])), [story?.id]);
  const [picked, setPicked] = useState<string[]>([]);
  const [run, busy, error] = useAction();
  const active = jobs.data?.some((j) => j.status === "queued" || j.status === "running") ?? false;
  usePoll(() => { jobs.reload(); if (!active) refresh().catch(() => undefined); }, 1500, active);
  if (!story || !hasBoard) return <NoStoryboard />;

  const start = (mode: "preview" | "final") =>
    run(async () => {
      await api.post(`/stories/${story.id}/render`, { mode, scene_ids: picked.length ? picked : null });
      jobs.reload();
    });

  return (
    <>
      <h1 className="text-2xl font-bold">Render Manager</h1>
      <ErrorNote message={error ?? jobs.error} />
      {can("producer") && (
        <Card title="Start a render">
          <fieldset className="mb-3 flex flex-wrap gap-3 text-sm">
            <legend className="mb-1 font-medium">Scenes (none ticked = the whole story; unchanged scenes are reused)</legend>
            {scenes.map((s) => (
              <label key={s.id} className="flex items-center gap-1">
                <input type="checkbox" checked={picked.includes(s.scene_id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.scene_id] : picked.filter((p) => p !== s.scene_id))} />
                Scene {s.scene_number}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => start("preview")}>
              Render preview (360p)
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => start("final")}>
              Render final ({story.story_json?.output.width}×{story.story_json?.output.height})
            </Button>
          </div>
        </Card>
      )}
      {jobs.data?.length === 0 && <Empty>No renders yet.</Empty>}
      {jobs.data?.map((job) => {
        const final = job.outputs.find((o) => o.type === "final" || o.type === "preview");
        return (
          <Card
            key={job.id}
            title={
              <span data-testid="job">
                {job.type === "scene_preview" ? "Scene preview" : `Story render (${job.mode})`} <Badge>{job.status}</Badge>
              </span>
            }
            actions={
              can("producer") && (
                <>
                  {(job.status === "queued" || job.status === "running") && (
                    <Button variant="danger" onClick={() => run(async () => { await api.post(`/render-jobs/${job.id}/cancel`); jobs.reload(); })}>
                      Cancel
                    </Button>
                  )}
                  {["failed", "cancelled", "interrupted"].includes(job.status) && (
                    <Button variant="ghost" onClick={() => run(async () => { await api.post(`/render-jobs/${job.id}/resume`); jobs.reload(); })}>
                      Resume
                    </Button>
                  )}
                </>
              )
            }
          >
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={job.progress} />
                </div>
                <span data-testid="job-progress">{Math.round(job.progress * 100)}%</span>
              </div>
              <p>
                <b>Current scene</b> {job.current_scene ?? "—"} · <b>Completed</b> {job.completed_scenes.join(", ") || "none"} · <b>Failed</b>{" "}
                {job.failed_scenes.join(", ") || "none"} · <b>Render time</b> {seconds(job.render_seconds)} · story version {job.story_version}
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(job.scenes).map(([id, s]) => (
                  <span key={id} title={s.error ?? ""}>
                    <Badge tone={s.status}>
                      {id}: {s.status}
                    </Badge>
                  </span>
                ))}
              </div>
              {job.error_message && <ErrorNote message={job.error_message} />}
              {final && (
                <div className="flex flex-wrap items-center gap-3">
                  <a className="font-medium text-brand underline" href={media(final.url)} target="_blank" rel="noreferrer" data-testid="job-output">
                    Open video ({final.resolution}, {seconds(final.duration)})
                  </a>
                  <a className="text-brand underline" href={media(`${final.url}?download=1`)}>
                    Download
                  </a>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </>
  );
}
