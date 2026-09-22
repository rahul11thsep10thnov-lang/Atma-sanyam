import Link from "next/link";

const SETTINGS_SECTIONS = [
  { href: "/settings/privacy", label: "Privacy & Data", description: "Retention, storage, export, deletion." },
  { href: "/voices", label: "Voice", description: "Configured ElevenLabs voice and test playback." },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <div className="grid grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="card hover:bg-slate-50">
            <div className="text-sm font-semibold text-slate-900">{s.label}</div>
            <div className="text-sm text-slate-500 mt-1">{s.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
