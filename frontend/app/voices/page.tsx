import { backendFetch } from "@/lib/backend";
import { TestVoiceForm } from "./TestVoiceForm";
import { CloneVoiceForm } from "./CloneVoiceForm";

interface VoiceProfile {
  provider: string;
  voice_id: string;
  voice_mode: string;
  model_id: string;
  language: string;
  enabled: boolean;
  connected_at: string;
  status: string;
}

export default async function VoicesPage() {
  const profile = await backendFetch<VoiceProfile | null>("/voices").catch(() => null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Voice</h1>
        <p className="text-sm text-slate-500 mt-1">
          A single, natural AI teacher voice is used for every generated video — the same voice ID and
          settings across hundreds or thousands of lessons.
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Configured voice</h2>
        {profile && profile.voice_id ? (
          <dl className="text-sm text-slate-700 grid grid-cols-2 gap-y-2">
            <dt className="text-slate-500">Provider</dt>
            <dd>{profile.provider}</dd>
            <dt className="text-slate-500">Voice ID</dt>
            <dd className="font-mono text-xs">{profile.voice_id}</dd>
            {profile.provider === "chatterbox" && (
              <>
                <dt className="text-slate-500">Voice mode</dt>
                <dd>{profile.voice_mode === "clone" ? "Cloned from your sample" : "Predefined"}</dd>
              </>
            )}
            {profile.provider === "elevenlabs" && (
              <>
                <dt className="text-slate-500">Model</dt>
                <dd>{profile.model_id}</dd>
              </>
            )}
            <dt className="text-slate-500">Language</dt>
            <dd>{profile.language}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd>{profile.status}</dd>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            No voice configured yet. Set ELEVENLABS_VOICE_ID (docs/ELEVENLABS.md) or run a self-hosted
            Chatterbox server and clone your voice below (docs/CHATTERBOX.md) — or leave MOCK_VOICE=true for
            development.
          </p>
        )}
      </div>

      <CloneVoiceForm />

      <TestVoiceForm />
    </div>
  );
}
