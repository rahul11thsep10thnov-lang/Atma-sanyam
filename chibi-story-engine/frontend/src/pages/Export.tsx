import { NoStoryboard } from "../components/NoStoryboard";
import { Badge, Button, Card, Empty, ErrorNote, seconds } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { RenderOutput } from "../types";

export function ExportPage() {
  const { story, refresh, can, user } = useStudio();
  const exports = useLoad<RenderOutput[]>(() => (story ? api.get<RenderOutput[]>(`/stories/${story.id}/exports`) : Promise.resolve([])), [story?.id, story?.status]);
  const [run, busy, error] = useAction();
  if (!story || !story.story_json) return <NoStoryboard />;
  const publish = (id: string, override: boolean) =>
    run(async () => {
      await api.post(`/stories/${story.id}/publish`, { output_id: id, override_approvals: override });
      exports.reload();
      await refresh();
    });
  return (
    <>
      <h1 className="text-2xl font-bold">Export</h1>
      <ErrorNote message={error ?? exports.error} />
      {exports.data?.length === 0 && <Empty>Nothing to export yet. Render the story in the Render Manager.</Empty>}
      {exports.data?.map((o) => (
        <Card
          key={o.id}
          title={
            <span>
              {o.type === "final" ? "Final video" : o.scene_id ? `Preview of ${o.scene_id}` : "Preview"} · {o.resolution} · {seconds(o.duration)}{" "}
              {o.published && <Badge tone="published">published</Badge>} {o.story_version !== story.current_version && <Badge tone="warning">older version {o.story_version}</Badge>}
            </span>
          }
          actions={
            <>
              <a className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white" href={media(o.download_url)} data-testid="download">
                Download MP4
              </a>
              {o.type === "final" && !o.published && can("producer", "reviewer") && (
                <Button variant="ghost" disabled={busy} onClick={() => publish(o.id, false)}>
                  Publish
                </Button>
              )}
              {o.type === "final" && !o.published && user?.role === "admin" && (
                <Button variant="ghost" disabled={busy} onClick={() => publish(o.id, true)}>
                  Publish without approvals
                </Button>
              )}
            </>
          }
        >
          <video controls preload="metadata" className="w-full max-w-3xl rounded-lg border border-line" src={media(o.url)} />
        </Card>
      ))}
    </>
  );
}
