"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RetentionSettings {
  source_files: string;
  generated_lessons: string;
  generated_audio: string;
  preview_videos: string;
  final_videos: string;
  job_logs: string;
  temporary_files: string;
}

const OPTIONS = [
  { value: "7_days", label: "7 days" },
  { value: "30_days", label: "30 days" },
  { value: "90_days", label: "90 days" },
  { value: "1_year", label: "1 year" },
  { value: "never", label: "Never automatically delete" },
];

const FIELD_LABELS: Record<keyof RetentionSettings, string> = {
  source_files: "Source files",
  generated_lessons: "Generated lessons",
  generated_audio: "Generated audio",
  preview_videos: "Preview videos",
  final_videos: "Final videos",
  job_logs: "Job logs",
  temporary_files: "Temporary files",
};

export function RetentionSettingsForm({ initial }: { initial: RetentionSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  function update(field: keyof RetentionSettings, value: string) {
    const prevIndex = OPTIONS.findIndex((o) => o.value === settings[field]);
    const nextIndex = OPTIONS.findIndex((o) => o.value === value);
    if (value === "never") {
      setWarning("Files will remain stored until you manually delete them.");
    } else if (nextIndex < prevIndex) {
      setWarning("Changing this setting may permanently delete files after they become eligible for deletion.");
    } else {
      setWarning(null);
    }
    setSettings({ ...settings, [field]: value });
  }

  async function save() {
    setBusy(true);
    await fetch("/api/proxy/privacy/settings", { method: "PUT", body: JSON.stringify(settings) });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Retention</h2>
      <p className="text-xs text-slate-500">
        After each period, eligible files are automatically deleted by a daily retention sweep.
      </p>
      {(Object.keys(FIELD_LABELS) as (keyof RetentionSettings)[]).map((field) => (
        <div key={field} className="flex items-center justify-between">
          <label className="text-sm text-slate-700">{FIELD_LABELS[field]}</label>
          <select
            value={settings[field]}
            onChange={(e) => update(field, e.target.value)}
            className="rounded-md border border-slate-300 text-sm px-2 py-1"
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {warning && <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">{warning}</p>}
      <button onClick={save} disabled={busy} className="btn-primary">
        Save retention settings
      </button>
    </div>
  );
}
