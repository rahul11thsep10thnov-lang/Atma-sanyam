import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, ErrorNote, Field, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api } from "../services/api";
import type { Project, StorySummary } from "../types";

interface BoardResult {
  missing_assets: { kind: string; suggested_id: string; display_name: string; reason: string }[];
  warnings: string[];
  character_map: Record<string, string>;
  environment_map: Record<string, string>;
}

const EMPTY = { title: "", original_text: "", language: "hi-IN", genre: "panchatantra", moral: "", visual_style: "premium_chibi_anime", target: "" };

export function StoryStudio() {
  const { story, selectStory, refresh, can } = useStudio();
  const projects = useLoad(() => api.get<Project[]>("/projects"), []);
  const navigate = useNavigate();
  const [isNew, setIsNew] = useState(!story);
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [run, busy, error] = useAction();

  useEffect(() => {
    if (story && !isNew) {
      setProjectId(story.project_id);
      setForm({ title: story.title, original_text: story.original_text, language: story.language, genre: story.genre ?? "", moral: story.moral ?? "",
                visual_style: String(story.settings_json.visual_style ?? "premium_chibi_anime"), target: String(story.settings_json.target_duration_seconds ?? "") });
    }
  }, [story, isNew]);
  useEffect(() => {
    if (!projectId && projects.data?.length) setProjectId(projects.data[0].id);
  }, [projects.data, projectId]);

  const project = projects.data?.find((p) => p.id === projectId);
  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save(): Promise<string> {
    if (isNew || !story) {
      const created = await api.post<StorySummary>("/stories", {
        project_id: projectId, title: form.title, original_text: form.original_text, language: form.language, genre: form.genre || null,
        moral: form.moral || null, visual_style: form.visual_style, target_duration_seconds: form.target ? Number(form.target) : null,
      });
      selectStory(created.id);
      setIsNew(false);
      return created.id;
    }
    await api.patch(`/stories/${story.id}`, { title: form.title, original_text: form.original_text, language: form.language, genre: form.genre || null, moral: form.moral || null });
    return story.id;
  }

  const generate = () =>
    run(async () => {
      const id = await save();
      await api.post(`/stories/${id}/analyse`);
      setBoard(await api.post<BoardResult>(`/stories/${id}/generate-storyboard`));
      await refresh();
    });

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Story Studio</h1>
        <Button variant="ghost" onClick={() => { setIsNew(true); setForm(EMPTY); setBoard(null); }}>
          New story
        </Button>
        {isNew && story && (
          <Button variant="ghost" onClick={() => setIsNew(false)}>
            Back to “{story.title}”
          </Button>
        )}
      </div>
      <Card title={isNew ? "New story" : "Edit story"}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Project">
            <select className={inputClass} value={projectId} disabled={!isNew} onChange={(e) => setProjectId(e.target.value)}>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Story title">
            <input className={inputClass} value={form.title} onChange={set("title")} maxLength={300} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Story text" hint="Separate scenes with a blank line. Put spoken words in quotation marks.">
              <textarea className={`${inputClass} h-64 leading-relaxed`} lang={form.language} value={form.original_text} onChange={set("original_text")} />
            </Field>
          </div>
          <Field label="Language">
            <select className={inputClass} value={form.language} onChange={set("language")}>
              <option value="hi-IN">Hindi</option>
              <option value="en-IN">English</option>
            </select>
          </Field>
          <Field label="Genre">
            <select className={inputClass} value={form.genre} onChange={set("genre")}>
              {["panchatantra", "hitopadesha", "jataka", "akbar_birbal", "tenali_raman", "original", "folktale"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Moral" hint="Filled in from a “शिक्षा:” line if you leave it empty.">
            <input className={inputClass} value={form.moral} onChange={set("moral")} />
          </Field>
          <Field label="Visual style">
            <select className={inputClass} value={form.visual_style} onChange={set("visual_style")} disabled={!isNew}>
              <option value="premium_chibi_anime">Premium chibi anime</option>
            </select>
          </Field>
          <Field label="Target duration (seconds)" hint="Optional guide; the storyboard follows the narration's length.">
            <input className={inputClass} type="number" min={10} max={3600} value={form.target} onChange={set("target")} disabled={!isNew} />
          </Field>
          <Field label="Output format">
            <input className={inputClass} readOnly value={project ? `${project.default_resolution} MP4, ${project.default_fps} fps` : ""} />
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <ErrorNote message={error} />
          {can("producer") && (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy || !form.title || !form.original_text || !projectId} onClick={() => run(async () => { await save(); await refresh(); })}>
                Save story
              </Button>
              <Button disabled={busy || !form.title || !form.original_text || !projectId} onClick={generate}>
                {busy ? "Working…" : "Generate storyboard"}
              </Button>
            </div>
          )}
        </div>
      </Card>
      {board && (
        <Card title="Storyboard generated" actions={<Button onClick={() => navigate("/storyboard")}>Open storyboard</Button>}>
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="font-medium">Characters matched</dt>
              <dd data-testid="character-map">
                {Object.entries(board.character_map).map(([k, v]) => (
                  <span key={k} className="mr-2 inline-block">
                    {k} → <code>{v}</code>
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Environments</dt>
              <dd>{[...new Set(Object.values(board.environment_map))].join(", ")}</dd>
            </div>
          </dl>
          {board.missing_assets.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="font-medium">Assets that need to be produced before rendering</div>
              <ul className="list-disc pl-5">
                {board.missing_assets.map((m) => (
                  <li key={m.suggested_id}>
                    <Badge tone="warning">{m.kind}</Badge> <code>{m.suggested_id}</code> — {m.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {board.warnings.map((w) => (
            <p key={w} className="mt-2 text-sm text-amber-800">
              {w}
            </p>
          ))}
        </Card>
      )}
    </>
  );
}
