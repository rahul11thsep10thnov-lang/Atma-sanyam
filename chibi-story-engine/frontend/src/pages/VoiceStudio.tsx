import { useState } from "react";
import { NoStoryboard } from "../components/NoStoryboard";
import { Badge, Button, Card, Empty, ErrorNote, inputClass, seconds } from "../components/ui";
import { useAction, useLoad } from "../hooks/useAsync";
import { useStudio } from "../hooks/useStudio";
import { api, media } from "../services/api";
import type { AudioClip, Voice } from "../types";

interface AudioResult {
  generated: number;
  reused: number;
  problems: { line: string; message: string }[];
  retimed_shots: unknown[];
  total_duration: number;
  provider: string;
}

export function VoiceStudio() {
  const { story, refresh, can } = useStudio();
  const voices = useLoad(() => api.get<{ provider: string; provider_available: boolean; voices: Voice[] }>("/voices"), []);
  const clips = useLoad<AudioClip[]>(() => (story && story.current_version ? api.get<AudioClip[]>(`/stories/${story.id}/audio`) : Promise.resolve([])), [story?.id, story?.current_version]);
  const [result, setResult] = useState<AudioResult | null>(null);
  const [run, busy, error] = useAction();
  if (!story || !story.story_json) return <NoStoryboard />;
  const def = story.story_json;

  const setVoice = (update: (d: typeof def) => void) =>
    run(async () => {
      const copy = structuredClone(def);
      update(copy);
      await api.patch(`/stories/${story.id}`, { story_json: copy, change_summary: "Change voice assignment" });
      await refresh();
    });
  const generate = (force: boolean) =>
    run(async () => {
      setResult(await api.post<AudioResult>(`/stories/${story.id}/generate-audio`, { force, retime: true }));
      await refresh();
      clips.reload();
    });
  const options = voices.data?.voices.map((v) => (
    <option key={v.id} value={v.id}>
      {v.name} — {v.description}
    </option>
  ));

  return (
    <>
      <h1 className="text-2xl font-bold">Voice Studio</h1>
      <ErrorNote message={error ?? voices.error} />
      <Card title="Voices" actions={voices.data && <Badge tone={voices.data.provider_available ? "pass" : "error"}>provider: {voices.data.provider}</Badge>}>
        <table className="w-full text-left text-sm">
          <tbody>
            <tr className="border-b border-line">
              <th className="p-2">Narrator</th>
              <td className="p-2">
                <select aria-label="Narrator voice" className={inputClass} disabled={busy || !can("producer")} value={def.audio.narrator_voice} onChange={(e) => setVoice((d) => { d.audio.narrator_voice = e.target.value; })}>
                  {options}
                </select>
              </td>
            </tr>
            {def.characters.map((c, i) => (
              <tr key={c.character_id} className="border-b border-line">
                <th className="p-2">
                  <code>{c.character_id}</code>
                </th>
                <td className="p-2">
                  <select aria-label={`Voice of ${c.character_id}`} className={inputClass} disabled={busy || !can("producer")} value={c.voice_id ?? ""} onChange={(e) => setVoice((d) => { d.characters[i].voice_id = e.target.value || null; })}>
                    <option value="">Character's own voice</option>
                    {options}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card
        title="Narration and dialogue"
        actions={
          can("producer") && (
            <>
              <Button disabled={busy} onClick={() => generate(false)}>
                {busy ? "Generating…" : "Generate narration"}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => generate(true)}>
                Regenerate everything
              </Button>
            </>
          )
        }
      >
        {result && (
          <p role="status" className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" data-testid="audio-result">
            {result.generated} lines generated, {result.reused} reused from the cache. {result.retimed_shots.length} shots re-timed; the story now runs {seconds(result.total_duration)}.
            {result.problems.length > 0 && ` ${result.problems.length} problems: ${result.problems.map((p) => p.message).join("; ")}`}
          </p>
        )}
        {clips.data?.length === 0 && <Empty>No audio yet. Choose “Generate narration”.</Empty>}
        <ul className="space-y-2">
          {clips.data?.map((c) => (
            <li key={c.id} className="rounded-lg border border-line p-2 text-sm" data-testid="audio-clip">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={c.type === "narration" ? "info" : "pending"}>{c.type}</Badge>
                <code className="text-xs">{c.voice_id}</code>
                <span className="text-xs text-stone-500">{seconds(c.duration)}</span>
                <audio controls preload="none" className="ml-auto h-8" src={media(c.url)} />
              </div>
              <p lang="hi" className="mt-1">{c.text}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
