import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, Empty, ErrorNote, Field, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api } from "../services/api";
import type { Completion, LibraryStats, Project } from "../types";

export function Dashboard() {
  const { stories, storyId, selectStory, can } = useStudio();
  const projects = useLoad(() => api.get<Project[]>("/projects"), []);
  const stats = useLoad(() => api.get<LibraryStats>("/library/stats"), []);
  const completion = useLoad(() => api.get<Completion>("/library/completion"), []);
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
      {completion.data && <CompletionCard c={completion.data} />}
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

function CompletionCard({ c }: { c: Completion }) {
  const row = (label: string, done: number, of: number) => (
    <li key={label} className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={done === of ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
        {done} / {of}
      </span>
    </li>
  );
  const ch = c.characters, en = c.environments, sr = c.story_research;
  return (
    <Card title="Acceptance register (counted from registered files; planned assets are not counted)">
      <div className="grid gap-4 text-sm md:grid-cols-4" data-testid="completion-register">
        <div>
          <h3 className="mb-1 font-semibold">Characters ({ch.total})</h3>
          <ul className="space-y-0.5">
            {row("SVG masters", ch.with_svg_masters, ch.total)}
            {row("Four views", ch.with_four_views, ch.total)}
            {row("15 expressions", ch.with_15_expressions, ch.total)}
            {row("15 poses", ch.with_15_poses, ch.total)}
            {row("Validated rigs", ch.with_validated_rigs, ch.total)}
            {row("Original nine fully upgraded", ch.original_nine_fully_upgraded, 9)}
            {row("Approved", ch.approved, ch.total)}
          </ul>
          <p className="mt-1 text-xs text-stone-500">Pending {ch.pending} · rejected {ch.rejected}. No four views yet: {ch.without_four_views.join(", ") || "none"}.</p>
        </div>
        <div>
          <h3 className="mb-1 font-semibold">Backgrounds ({en.total})</h3>
          <ul className="space-y-0.5">
            {row("Wide compositions", en.wide, en.total)}
            {row("Medium compositions", en.medium, en.wide)}
            {row("Close-up compositions", en.closeup, en.wide)}
            {row("Complete layer files (with SVG)", en.with_complete_layer_files, en.total)}
            {row("Camera and anchors valid", en.with_validated_camera_and_anchors, en.total)}
            {row("Approved", en.approved, en.total)}
          </ul>
          <p className="mt-1 text-xs text-stone-500">{en.wide_with_all_three_compositions} of {en.wide} wide backgrounds have all three compositions; pending {en.pending}.</p>
        </div>
        <div>
          <h3 className="mb-1 font-semibold">Rigs</h3>
          <ul className="space-y-0.5">
            {c.rigs.rigs.map((r) => (
              <li key={r.template} className="flex justify-between gap-3">
                <span>{r.label}</span>
                <span className={r.defined ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{r.defined ? `${r.characters} characters` : "not built"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-stone-500">
            Rig tests: {c.rigs.rig_test_results.passed ?? "not run"} passed, {c.rigs.rig_test_results.failed ?? 0} failed.
          </p>
        </div>
        <div>
          <h3 className="mb-1 font-semibold">Story research</h3>
          {sr.available ? (
            <ul className="space-y-0.5">
              {row("Collections with a consulted source", sr.collections_with_a_consulted_source ?? 0, sr.collections_total ?? 0)}
              <li className="flex justify-between"><span>Sources consulted</span><b>{sr.sources_consulted}</b></li>
              <li className="flex justify-between"><span>Stories catalogued</span><b>{(sr.source_records ?? 0) + (sr.seed_entries ?? 0)}</b></li>
              <li className="flex justify-between"><span>Verified / cross-verified</span><b>{sr.verified} / {sr.cross_verified}</b></li>
              <li className="flex justify-between"><span>Unverified / pending</span><b>{sr.unverified} / {sr.research_pending}</b></li>
              {row("Regions with a consulted source", sr.regions_with_a_consulted_source ?? 0, sr.regions_total ?? 0)}
            </ul>
          ) : (
            <p className="text-stone-500">Research register not generated.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
