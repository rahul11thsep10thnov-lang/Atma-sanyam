import { useStudio } from "./useStudio";
import { useLoad } from "./useAsync";
import { api } from "../services/api";
import type { RenderJob, Scene } from "../types";

/** Scenes of the current story (reloaded whenever the story's version changes). */
export function useScenes() {
  const { story } = useStudio();
  const hasBoard = !!story && story.current_version > 0;
  const result = useLoad<Scene[]>(() => (hasBoard ? api.get<Scene[]>(`/stories/${story!.id}/scenes`) : Promise.resolve([])), [story?.id, story?.current_version]);
  return { ...result, scenes: result.data ?? [], hasBoard };
}

/** Wait for a render job to leave the queue; reports progress on the way. */
export async function waitForJob(id: string, onUpdate?: (job: RenderJob) => void): Promise<RenderJob> {
  for (;;) {
    const job = await api.get<RenderJob>(`/render-jobs/${id}`);
    onUpdate?.(job);
    if (job.status !== "queued" && job.status !== "running") return job;
    await new Promise((r) => setTimeout(r, 1000));
  }
}
