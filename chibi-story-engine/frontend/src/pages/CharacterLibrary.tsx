import { useState, type FormEvent } from "react";
import { Badge, Button, Card, ErrorNote, Field, inputClass } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { Character, Voice } from "../types";

export function CharacterLibrary() {
  const { story, refresh, can } = useStudio();
  const characters = useLoad(() => api.get<Character[]>("/characters"), []);
  const voices = useLoad(() => api.get<{ voices: Voice[] }>("/voices"), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [run, busy, error] = useAction();
  const [form, setForm] = useState({ character_code: "", display_name: "", based_on: "monkey_001", aliases: "", default_voice: "" });
  const [entity, setEntity] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const current = characters.data?.find((c) => c.id === selected) ?? null;
  const entities = story?.analysis_json?.entities ?? [];
  const inStory = new Set(story?.story_json?.characters.map((c) => c.character_id));

  function create(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const made = await api.post<Character>("/characters", {
        character_code: form.character_code, display_name: form.display_name, based_on: form.based_on,
        aliases: form.aliases.split(",").map((a) => a.trim()).filter(Boolean), default_voice: form.default_voice || null,
      });
      characters.reload();
      setSelected(made.id);
    });
  }

  const assign = () =>
    run(async () => {
      if (!story || !current || !entity) return;
      await api.post(`/stories/${story.id}/generate-storyboard`, { character_overrides: { [entity]: current.id } });
      await refresh();
      setNotice(`“${entity}” is now played by ${current.display_name}. The storyboard was rebuilt.`);
    });

  return (
    <>
      <h1 className="text-2xl font-bold">Character Library</h1>
      <ErrorNote message={characters.error ?? error} />
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {characters.data?.map((c) => (
          <button key={c.id} onClick={() => setSelected(c.id)} data-testid={`character-${c.id}`} className={`rounded-xl border bg-card p-2 text-left ${selected === c.id ? "border-brand" : "border-line"}`}>
            <img src={media(c.thumbnail_url)} alt={c.display_name} className="mx-auto h-36 object-contain" loading="lazy" />
            <div className="mt-1 text-sm font-medium">{c.display_name}</div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
              <code>{c.id}</code> <Badge>{c.approval_status}</Badge> {inStory.has(c.id) && <Badge tone="info">in story</Badge>}
            </div>
          </button>
        ))}
      </div>
      {current && (
        <Card
          title={`${current.display_name} (${current.id}, version ${current.version})`}
          actions={
            can("reviewer") && current.approval_status !== "approved" ? (
              <Button variant="ghost" disabled={busy} onClick={() => run(async () => { await api.post(`/assets/character/${current.id}/approval`, { status: "approved" }); characters.reload(); })}>
                Approve design
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-3 text-sm">
            <p>{current.description}</p>
            <p>
              <b>Species</b> {current.species} · <b>Rig</b> <code>{current.rig_template}</code> · <b>Voice</b> <code>{current.default_voice ?? "none"}</code> · <b>Known as</b> {current.aliases.join(", ")}
            </p>
            <div>
              <b>Continuity rules</b>
              <ul className="list-disc pl-5">
                {current.continuity_rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            {current.problems.length > 0 && <ErrorNote message={`Problems: ${current.problems.map((p) => p.message).join("; ")}`} />}
            <div>
              <b>Expressions</b>
              <div className="mt-1 grid grid-cols-3 gap-2 md:grid-cols-9">
                {current.expression_images.map((e) => (
                  <figure key={e.name} className="rounded-lg border border-line p-1 text-center text-xs">
                    <img src={media(e.url)} alt={`${current.display_name}, ${e.name}`} className="mx-auto h-20 object-contain" loading="lazy" />
                    <figcaption>{e.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <p>
              <b>Poses</b> {current.poses.join(", ") || "none"} · <b>States</b> {current.states.join(", ")}
            </p>
            {can("producer") && story && entities.length > 0 && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-paper p-3">
                <Field label={`Use ${current.display_name} in “${story.title}” as`}>
                  <select aria-label="Story character" className={inputClass} value={entity} onChange={(e) => setEntity(e.target.value)}>
                    <option value="">Choose a story character…</option>
                    {entities.map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.display_name} ({e.key})
                      </option>
                    ))}
                  </select>
                </Field>
                <Button disabled={busy || !entity} onClick={assign}>
                  Select for story
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
      {can("producer") && (
        <Card title="Register a new character">
          <form onSubmit={create} className="grid gap-3 md:grid-cols-5">
            <Field label="Character id" hint="e.g. monkey_002">
              <input className={inputClass} required pattern="[a-z0-9][a-z0-9_\-]*" value={form.character_code} onChange={(e) => setForm({ ...form, character_code: e.target.value })} />
            </Field>
            <Field label="Display name">
              <input className={inputClass} required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </Field>
            <Field label="Starts from">
              <select className={inputClass} value={form.based_on} onChange={(e) => setForm({ ...form, based_on: e.target.value })}>
                {characters.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Names in stories" hint="comma-separated">
              <input className={inputClass} value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
            </Field>
            <Field label="Voice">
              <select className={inputClass} value={form.default_voice} onChange={(e) => setForm({ ...form, default_voice: e.target.value })}>
                <option value="">Same as the original</option>
                {voices.data?.voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-5">
              <Button type="submit" disabled={busy}>
                Register character
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
