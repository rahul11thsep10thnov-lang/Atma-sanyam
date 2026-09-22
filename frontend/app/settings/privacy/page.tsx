import { backendFetch } from "@/lib/backend";
import { RetentionSettingsForm } from "./RetentionSettingsForm";
import { DeleteAllForm } from "./DeleteAllForm";
import { ExportButton } from "./ExportButton";

interface RetentionSettings {
  source_files: string;
  generated_lessons: string;
  generated_audio: string;
  preview_videos: string;
  final_videos: string;
  job_logs: string;
  temporary_files: string;
}
interface StorageBreakdown {
  total_bytes: number;
  source_bytes: number;
  audio_bytes: number;
  video_bytes: number;
  other_bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(1)} ${units[unit]}`;
}

export default async function PrivacyPage() {
  const [settings, storage] = await Promise.all([
    backendFetch<RetentionSettings>("/privacy/settings"),
    backendFetch<StorageBreakdown>("/privacy/storage"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Privacy &amp; Data</h1>
        <p className="text-sm text-slate-500 mt-1">
          Retention and deletion are enforced server-side. Deleting a lesson removes its underlying files,
          not just a database flag. See docs/PRIVACY.md for full detail.
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Storage used</h2>
        <p className="text-2xl font-semibold text-slate-900">{formatBytes(storage.total_bytes)}</p>
        <div className="mt-3 text-sm text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Videos</span>
            <span>{formatBytes(storage.video_bytes)}</span>
          </div>
          <div className="flex justify-between">
            <span>Audio</span>
            <span>{formatBytes(storage.audio_bytes)}</span>
          </div>
          <div className="flex justify-between">
            <span>Sources</span>
            <span>{formatBytes(storage.source_bytes)}</span>
          </div>
          <div className="flex justify-between">
            <span>Other</span>
            <span>{formatBytes(storage.other_bytes)}</span>
          </div>
        </div>
      </div>

      <RetentionSettingsForm initial={settings} />

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Integrations</h2>
        <p className="text-sm text-slate-600">
          AI provider and ElevenLabs voice generation receive lesson source text / narration text to
          perform requested generation. See <span className="font-mono">docs/PRIVACY.md</span> for what is
          sent and why.
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Export</h2>
        <ExportButton />
      </div>

      <DeleteAllForm />
    </div>
  );
}
