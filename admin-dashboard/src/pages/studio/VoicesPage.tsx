import { useEffect, useState } from "react";
import { studioApi, Voice } from "../../api/studio";

const LANGS = ["hi", "en", "bn", "mr", "gu", "ta", "te", "kn", "ml", "pa", "or", "as"];

export function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [routing, setRouting] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () =>
    studioApi
      .voices()
      .then((res) => {
        setVoices(res.voices);
        setRouting(Object.fromEntries(res.routing.map((r) => [r.code, r.languages])));
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1>Base voices</h1>
      <p className="muted">
        Every story and language uses these voices. Set one ElevenLabs or Chatterbox voice ID per base voice and it keeps the same identity in every language. Google voices are per
        language. The grid shows which provider will speak each voice in each language right now ("placeholder" = silent, configure a provider).
      </p>
      {error && <p className="error">{error}</p>}
      {message && <p className="info">{message}</p>}
      {voices.map((v) => (
        <VoiceCard key={v.id} voice={v} routing={routing[v.code] ?? {}} onSaved={(m) => { setMessage(m); load(); }} onError={setError} />
      ))}
    </div>
  );
}

function VoiceCard({ voice, routing, onSaved, onError }: { voice: Voice; routing: Record<string, string>; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [elevenlabs, setElevenlabs] = useState(voice.providerVoiceIds.elevenlabs ?? "");
  const [chatterbox, setChatterbox] = useState(voice.providerVoiceIds.chatterbox ?? "");
  const [google, setGoogle] = useState(Object.entries(voice.providerVoiceIds.google ?? {}).map(([k, v]) => `${k}=${v}`).join("\n"));
  const [previewLang, setPreviewLang] = useState("hi");
  const [preview, setPreview] = useState<{ url: string; provider: string; isPlaceholder: boolean; reason?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const googleMap = Object.fromEntries(google.split("\n").map((l) => l.split("=").map((s) => s.trim())).filter(([k, v]) => k && v));
      await studioApi.updateVoice(voice.id, { providerVoiceIds: { elevenlabs: elevenlabs || undefined, chatterbox: chatterbox || undefined, google: googleMap } });
      onSaved(`${voice.code} saved`);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doPreview = async () => {
    setBusy(true);
    try {
      setPreview(await studioApi.previewVoice(voice.id, previewLang));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>
        {voice.code} — {voice.label} <span className="muted small">({voice.gender.toLowerCase()}, {voice.ageGroup.toLowerCase()}, {voice.tone.toLowerCase()}) · used in {voice._count.assignments} story role(s)</span>
      </h2>
      <p className="muted">{voice.description}</p>
      <div className="two-col">
        <label>
          ElevenLabs voice ID
          <input value={elevenlabs} onChange={(e) => setElevenlabs(e.target.value)} placeholder="e.g. 21m00Tcm4TlvDq8ikWAM" />
        </label>
        <label>
          Chatterbox voice (name/reference on your server)
          <input value={chatterbox} onChange={(e) => setChatterbox(e.target.value)} />
        </label>
        <label>
          Google voice overrides (one per line: <code>lang=voice-name</code>)
          <textarea rows={3} value={google} onChange={(e) => setGoogle(e.target.value)} placeholder="hi=hi-IN-Neural2-B" />
        </label>
      </div>
      <div className="routing-grid">
        {LANGS.map((l) => (
          <span key={l} className={`chip ${routing[l] === "placeholder" ? "chip-fail" : "chip-pass"}`}>
            {l}: {routing[l] ?? "?"}
          </span>
        ))}
      </div>
      <div className="action-row">
        <button disabled={busy} onClick={save}>
          Save
        </button>
        <select value={previewLang} onChange={(e) => setPreviewLang(e.target.value)}>
          {LANGS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button disabled={busy} onClick={doPreview}>
          Preview
        </button>
      </div>
      {preview && (
        <p className="small">
          {preview.provider}
          {preview.isPlaceholder ? ` (silent placeholder — ${preview.reason})` : ""} <audio controls autoPlay src={preview.url} />
        </p>
      )}
    </section>
  );
}
