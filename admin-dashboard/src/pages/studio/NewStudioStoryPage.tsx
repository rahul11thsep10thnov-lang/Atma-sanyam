import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateStudioStory, studioApi, StudioOptions } from "../../api/studio";
import { productionApi, RenderProfile } from "../../api/production";

const WARNING_OPTIONS = ["violence", "death", "suicide", "sexual_violence", "minors", "domestic_abuse", "dowry"];

export function NewStudioStoryPage() {
  const navigate = useNavigate();
  const [options, setOptions] = useState<StudioOptions | null>(null);
  const [profiles, setProfiles] = useState<RenderProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CreateStudioStory>({
    title: "",
    articleText: "",
    languages: ["hi", "en"],
    format: "SHORT",
    targetDurationSeconds: 150,
    animationStyle: "flat-2d-editorial",
    narratorVoiceCode: "VOICE_08",
    contentWarnings: [],
    resolution: "1080p",
    fps: 25,
    burnSubtitles: false,
    multiAudioPackage: false,
    allowDramatizedReconstruction: false,
    productionMode: "CINEMATIC_25D",
    renderProfileKey: "portrait-1080x1920-30",
  });
  const [pronunciation, setPronunciation] = useState("");

  useEffect(() => {
    studioApi.options().then(setOptions).catch((e) => setError(e.message));
    productionApi
      .renderProfiles()
      .then((r) => setProfiles(r.profiles.filter((p) => !p.isPreview || p.key.startsWith("draft"))))
      .catch(() => setProfiles([]));
  }, []);

  const set = <K extends keyof CreateStudioStory>(key: K, value: CreateStudioStory[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = (key: "languages" | "contentWarnings", value: string) =>
    setForm((f) => {
      const list = f[key] ?? [];
      return { ...f, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    set("articleText", text); // HTML is cleaned on the server
    if (!form.title) set("title", file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const pronunciationGuide = pronunciation
        .split("\n")
        .map((line) => line.split("=").map((s) => s.trim()))
        .filter(([term, value]) => term && value)
        .map(([term, value]) => ({ term, pronunciation: value }));
      const res = await studioApi.create({ ...form, pronunciationGuide, sourceUrl: form.sourceUrl || undefined });
      navigate(`/studio/${res.story.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!options) return <p>{error ?? "Loading..."}</p>;
  const range = form.format === "LONG" ? [180, 300] : [60, 180];

  return (
    <form onSubmit={submit} className="studio-form">
      <h1>New studio story</h1>

      <section className="card">
        <h2>Article</h2>
        <label>
          Title
          <input required minLength={5} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label>
          Paste the article (or upload a .txt/.html file)
          <textarea required minLength={200} rows={14} value={form.articleText} onChange={(e) => set("articleText", e.target.value)} />
        </label>
        <input type="file" accept=".txt,.html,.htm,.md" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="two-col">
          <label>
            Source name
            <input value={form.sourceName ?? ""} onChange={(e) => set("sourceName", e.target.value)} placeholder="e.g. The Example Times" />
          </label>
          <label>
            Source URL (optional)
            <input type="url" value={form.sourceUrl ?? ""} onChange={(e) => set("sourceUrl", e.target.value)} />
          </label>
          <label>
            Location (optional — detected automatically)
            <input value={form.locationText ?? ""} onChange={(e) => set("locationText", e.target.value)} placeholder="e.g. Sanganer, Jaipur" />
          </label>
        </div>
        <p className="muted">Only use articles you are licensed to adapt. Personal phone numbers, e-mails and ID numbers are removed automatically.</p>
      </section>

      <section className="card">
        <h2>Languages</h2>
        <div className="chip-row">
          {options.languages.map((l) => (
            <label key={l.code} className={`chip ${form.languages.includes(l.code) ? "chip-on" : ""}`}>
              <input type="checkbox" checked={form.languages.includes(l.code)} onChange={() => toggle("languages", l.code)} />
              {l.nativeName} <span className="muted">({l.englishName})</span>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Format &amp; style</h2>
        <div className="two-col">
          <label>
            Format
            <select value={form.format} onChange={(e) => set("format", e.target.value as "SHORT" | "LONG")}>
              {options.formats.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target duration: {form.targetDurationSeconds}s (never above 300s; never padded)
            <input type="range" min={range[0]} max={range[1]} step={10} value={Math.min(Math.max(form.targetDurationSeconds ?? range[0], range[0]), range[1])} onChange={(e) => set("targetDurationSeconds", Number(e.target.value))} />
          </label>
          <label>
            Animation style
            <select value={form.animationStyle} onChange={(e) => set("animationStyle", e.target.value)}>
              {options.animationStyles.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Narrator voice
            <select value={form.narratorVoiceCode} onChange={(e) => set("narratorVoiceCode", e.target.value)}>
              {options.voices
                .filter((v) => v.isNarratorEligible)
                .map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.code} — {v.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Production mode
            <select value={form.productionMode} onChange={(e) => set("productionMode", e.target.value as "CLASSIC" | "CINEMATIC_25D")}>
              <option value="CINEMATIC_25D">Cinematic 2.5D (shots)</option>
              <option value="CLASSIC">Classic (stills)</option>
            </select>
          </label>
          {form.productionMode === "CINEMATIC_25D" ? (
            <label>
              Render profile
              <select value={form.renderProfileKey} onChange={(e) => set("renderProfileKey", e.target.value)}>
                {(profiles.length ? profiles : [{ key: "portrait-1080x1920-30", name: "Portrait 1080×1920 @ 30 fps" } as RenderProfile]).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                Resolution
                <select value={form.resolution} onChange={(e) => set("resolution", e.target.value as "720p" | "1080p")}>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                </select>
              </label>
              <label>
                Frame rate
                <select value={form.fps} onChange={(e) => set("fps", Number(e.target.value) as 24 | 25 | 30)}>
                  <option value={24}>24 fps</option>
                  <option value={25}>25 fps</option>
                  <option value={30}>30 fps</option>
                </select>
              </label>
            </>
          )}
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={!!form.burnSubtitles} onChange={(e) => set("burnSubtitles", e.target.checked)} /> Burn subtitles into the picture (SRT/VTT files are always produced)
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={!!form.multiAudioPackage} onChange={(e) => set("multiAudioPackage", e.target.checked)} /> Also build one multi-audio MP4 with every language
        </label>
      </section>

      <section className="card">
        <h2>Editorial guidance</h2>
        <p className="muted">Content warnings (sensitive topics are also detected automatically):</p>
        <div className="chip-row">
          {WARNING_OPTIONS.map((w) => (
            <label key={w} className={`chip ${form.contentWarnings?.includes(w) ? "chip-on" : ""}`}>
              <input type="checkbox" checked={!!form.contentWarnings?.includes(w)} onChange={() => toggle("contentWarnings", w)} />
              {w.replace("_", " ")}
            </label>
          ))}
        </div>
        <label>
          Character notes (optional)
          <textarea rows={3} value={form.characterNotes ?? ""} onChange={(e) => set("characterNotes", e.target.value)} placeholder="e.g. The SHO is a woman; the couple are in their thirties." />
        </label>
        <label>
          Scene notes (optional)
          <textarea rows={3} value={form.sceneNotes ?? ""} onChange={(e) => set("sceneNotes", e.target.value)} placeholder="e.g. Open on the police station exterior." />
        </label>
        <label>
          Pronunciation guide — one per line: <code>term = pronunciation</code>
          <textarea rows={3} value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} placeholder="Sanganer = सांगानेर" />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={!!form.allowDramatizedReconstruction} onChange={(e) => set("allowDramatizedReconstruction", e.target.checked)} /> Allow labelled dramatised dialogue for anonymised characters (never attributed to named real people)
        </label>
      </section>

      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy || form.languages.length === 0}>
        {busy ? "Creating..." : "Create & analyse"}
      </button>
    </form>
  );
}
