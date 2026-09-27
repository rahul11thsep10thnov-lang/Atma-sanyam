import { FormEvent, useEffect, useState } from "react";
import { ProviderStatus, studioApi } from "../../api/studio";

type Library = Awaited<ReturnType<typeof studioApi.library>>;

export function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [ffmpeg, setFfmpeg] = useState<boolean | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    studioApi.providers().then((r) => {
      setProviders(r.providers);
      setFfmpeg(r.ffmpegAvailable);
    }).catch((e) => setError(e.message));
    studioApi.library().then(setLibrary).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const update = async (p: ProviderStatus, data: Record<string, unknown>) => {
    try {
      await studioApi.updateProvider(p.kind, p.key, data);
      setMessage(`${p.kind} ${p.key} updated`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const kinds = [...new Set(providers.map((p) => p.kind))];
  return (
    <div>
      <h1>AI providers</h1>
      <p className="muted">
        API keys live only in the backend <code>.env</code> file and are never shown here. This page shows whether each provider is configured, and lets a super-admin enable/disable
        providers, set voice priority and restrict languages to those you have verified.
      </p>
      <p>
        FFmpeg on the API host: {ffmpeg === null ? "…" : ffmpeg ? <span className="info">available</span> : <span className="error">not found — renders will be manifests only</span>}
      </p>
      {error && <p className="error">{error}</p>}
      {message && <p className="info">{message}</p>}
      {kinds.map((kind) => (
        <section className="card" key={kind}>
          <h2>{kind}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Credentials</th>
                <th>In use</th>
                <th>Enabled</th>
                {kind === "VOICE" && <th>Priority</th>}
                <th>Languages</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {providers
                .filter((p) => p.kind === kind)
                .map((p) => (
                  <tr key={p.key}>
                    <td>{p.key}</td>
                    <td>
                      {p.configured ? <span className="info">configured</span> : <span className="error">missing</span>}
                      <div className="muted small">{p.requiredEnv.join(", ")}</div>
                    </td>
                    <td>{p.active ? "✓" : ""}</td>
                    <td>
                      <input type="checkbox" checked={p.enabled} onChange={(e) => update(p, { isEnabled: e.target.checked })} />
                    </td>
                    {kind === "VOICE" && (
                      <td>
                        <input type="number" style={{ width: 70 }} defaultValue={p.priority} onBlur={(e) => Number(e.target.value) !== p.priority && update(p, { priority: Number(e.target.value) })} />
                      </td>
                    )}
                    <td className="small">
                      {kind === "VOICE" && p.key !== "mock" ? (
                        <input
                          defaultValue={(p.languages ?? []).join(",")}
                          onBlur={(e) => update(p, { settings: { languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
                        />
                      ) : (
                        (p.languages ?? []).join(", ")
                      )}
                    </td>
                    <td className="small">{p.notes}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
      {library && <LibraryCard library={library} onChange={load} onError={setError} />}
    </div>
  );
}

function LibraryCard({ library, onChange, onError }: { library: Library; onChange: () => void; onError: (m: string) => void }) {
  const [kind, setKind] = useState<"music" | "sfx">("music");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [license, setLicense] = useState("");
  const [mood, setMood] = useState("neutral");
  const [tag, setTag] = useState("room-tone");

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      await studioApi.uploadLibrary(kind, file, kind === "music" ? { title, license, mood } : { title, license, tag });
      setTitle("");
      setFile(null);
      onChange();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  return (
    <section className="card">
      <h2>Music &amp; sound-effect library</h2>
      <p className="muted">
        Upload only audio you are licensed to use. Music is always mixed low and ducked under speech. SFX tags match scene ambience (room-tone, office-murmur, traffic-distant,
        street-murmur, hospital-hum, rural-birds, rural-wind, station-murmur) — without a file, a very quiet generated room tone is used.
      </p>
      <form onSubmit={upload} className="action-row wrap">
        <select value={kind} onChange={(e) => setKind(e.target.value as "music" | "sfx")}>
          <option value="music">Music</option>
          <option value="sfx">Sound effect / ambience</option>
        </select>
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input required placeholder="Licence (e.g. CC-BY 4.0, purchased from …)" value={license} onChange={(e) => setLicense(e.target.value)} />
        {kind === "music" ? (
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            {["neutral", "somber", "tense-subtle", "hopeful"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input placeholder="tag" value={tag} onChange={(e) => setTag(e.target.value)} />
        )}
        <input required type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit">Upload</button>
      </form>
      <table className="data-table">
        <tbody>
          {library.music.map((m) => (
            <tr key={m.id}>
              <td>music · {m.mood}</td>
              <td>{m.title}</td>
              <td className="small">{m.license}</td>
              <td>{m.durationSeconds.toFixed(0)}s</td>
              <td>
                <input type="checkbox" checked={m.isActive} onChange={(e) => studioApi.setLibraryActive("music", m.id, e.target.checked).then(onChange)} />
              </td>
            </tr>
          ))}
          {library.soundEffects.map((s) => (
            <tr key={s.id}>
              <td>sfx · {s.tag}</td>
              <td>{s.title}</td>
              <td className="small">{s.license}</td>
              <td>{s.durationSeconds.toFixed(0)}s</td>
              <td>
                <input type="checkbox" checked={s.isActive} onChange={(e) => studioApi.setLibraryActive("sfx", s.id, e.target.checked).then(onChange)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
