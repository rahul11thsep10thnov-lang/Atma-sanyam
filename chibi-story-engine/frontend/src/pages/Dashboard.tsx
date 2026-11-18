import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, Empty, ErrorNote, Field, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api } from "../services/api";
import type { LibraryStats, Project } from "../types";

export function Dashboard() {
  const { stories, storyId, selectStory, can } = useStudio();
  const projects = useLoad(() => api.get<Project[]>("/projects"), []);
  const stats = useLoad(() => api.get<LibraryStats>("/library/stats"), []);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [run, busy, error] = useAction();

  function create(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      await api.post("/projects", { name, description });
      setName("");
      setDescription("");
      projects.reload();
    });
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {stats.data && (
        <Card title="Asset library (counted from the files on disk)">
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5" data-testid="library-stats">
            {(["character", "environment", "component", "prop", "effect"] as const).map((k) => (
              <div key={k} className="rounded-lg border border-line p-3">
                <div className="text-2xl font-bold">{stats.data!.by_type[k] ?? 0}</div>
                <div className="text-stone-500">{k.replace("_", " ")}s</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {stats.data.environment_layers} background layers · {stats.data.png_layers} runtime PNGs · {stats.data.svg_masters} SVG masters · {stats.data.scare_layers} adjustable-scare layers
          </p>
          <p className="text-xs text-stone-500" data-testid="library-approval">
            Approved {Object.entries(stats.data.approval).filter(([k]) => k.endsWith(":approved")).reduce((n, [, v]) => n + v, 0)} · pending{" "}
            {Object.entries(stats.data.approval).filter(([k]) => k.endsWith(":pending")).reduce((n, [, v]) => n + v, 0)} · rejected{" "}
            {Object.entries(stats.data.approval).filter(([k]) => k.endsWith(":rejected")).reduce((n, [, v]) => n + v, 0)} · duplicate groups {stats.data.duplicate_asset_groups.length} ·
            used by several stories {stats.data.assets_used_by_several_stories}
          </p>
          {stats.data.stories && (
            <p className="text-xs text-stone-500">
              Stories tracked {stats.data.stories.stories} (built {stats.data.stories.implemented}; every asset matched for {stats.data.stories.fully_covered}). Missing:{" "}
              {Object.entries(stats.data.stories.unmatched_needs).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" · ") || "none"}.
            </p>
          )}
          <p className="text-xs text-stone-500">
            Not yet delivered: {stats.data.not_delivered.join("; ")}.
          </p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Projects">
          <ErrorNote message={projects.error} />
          {projects.data?.length === 0 && <Empty>No projects yet. Create one to begin.</Empty>}
          <ul className="space-y-2">
            {projects.data?.map((p) => (
              <li key={p.id} className="rounded-lg border border-line p-3 text-sm" data-testid="project">
                <div className="font-medium">{p.name}</div>
                <div className="text-stone-500">
                  {p.default_language} · {p.default_resolution} · {p.default_fps} fps · {stories.filter((s) => s.project_id === p.id).length} stories
                </div>
              </li>
            ))}
          </ul>
          {can("producer") && (
            <form onSubmit={create} className="mt-4 space-y-2 border-t border-line pt-3">
              <Field label="New project name">
                <input className={inputClass} required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Description">
                <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <ErrorNote message={error} />
              <Button type="submit" disabled={busy}>
                Create project
              </Button>
            </form>
          )}
        </Card>
        <Card title="Stories" actions={<Link className="text-sm font-medium text-brand underline" to="/story">New story</Link>}>
          {stories.length === 0 && <Empty>No stories yet. Open Story Studio to paste one.</Empty>}
          <ul className="space-y-2">
            {stories.map((s) => (
              <li key={s.id} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${s.id === storyId ? "border-brand" : "border-line"}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.title}</div>
                  <div className="text-stone-500">
                    {s.language} · version {s.current_version}
                  </div>
                </div>
                <Badge>{s.status}</Badge>
                {s.id !== storyId && (
                  <Button variant="ghost" onClick={() => selectStory(s.id)}>
                    Open
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
