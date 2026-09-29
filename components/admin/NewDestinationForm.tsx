"use client";

import { useState } from "react";

interface Step {
  step: string;
  status: "OK" | "WARN" | "FAILED" | "SKIPPED";
  detail: string;
}
interface Result {
  ok: boolean;
  note?: string;
  steps: Step[];
  page_url: string | null;
  error?: string;
  content?: { sections: number; fact_check: string; seo_issues: Array<{ severity: string; message: string }> } | null;
}

const CATEGORY_CHOICES = ["HERITAGE", "HISTORY", "SPIRITUAL", "NATURE", "BEACH", "MOUNTAIN", "HILL_STATION", "ADVENTURE", "CULTURAL", "FOOD", "SHOPPING", "WILDLIFE", "WELLNESS", "FAMILY", "ROMANTIC"];
const STATUS_STYLE = { OK: "text-forest-700", WARN: "text-saffron-700", FAILED: "text-terracotta-700", SKIPPED: "text-charcoal-light" } as const;

/** Runs the onboarding pipeline as a dry run and shows every step, so an editor sees what would be created and why something fails. */
export function NewDestinationForm({ states }: { states: Array<{ code: string; name: string }> }) {
  const [form, setForm] = useState({ name: "", state: states[0]?.code ?? "", latitude: "", longitude: "", one_line_description: "", short_description: "", best_time_text: "" });
  const [categories, setCategories] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const field = "mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/pipeline/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, categories })
      });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, steps: [], page_url: null, error: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={onSubmit} className="card-surface space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-charcoal">Name<input required value={form.name} onChange={set("name")} className={field} /></label>
          <label className="block text-sm font-medium text-charcoal">State / UT
            <select value={form.state} onChange={set("state")} className={field}>
              {states.map((s) => (<option key={s.code} value={s.code}>{s.name}</option>))}
            </select>
          </label>
          <label className="block text-sm font-medium text-charcoal">Latitude<input required inputMode="decimal" value={form.latitude} onChange={set("latitude")} className={field} /></label>
          <label className="block text-sm font-medium text-charcoal">Longitude<input required inputMode="decimal" value={form.longitude} onChange={set("longitude")} className={field} /></label>
        </div>
        <label className="block text-sm font-medium text-charcoal">One-line description<input required value={form.one_line_description} onChange={set("one_line_description")} className={field} /></label>
        <label className="block text-sm font-medium text-charcoal">Short description (40+ characters)<textarea required rows={3} value={form.short_description} onChange={set("short_description")} className={field} /></label>
        <label className="block text-sm font-medium text-charcoal">Best time to visit (as reported)<input value={form.best_time_text} onChange={set("best_time_text")} className={field} /></label>
        <fieldset>
          <legend className="text-sm font-medium text-charcoal">Categories</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_CHOICES.map((c) => (
              <label key={c} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${categories.includes(c) ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 text-charcoal"}`}>
                <input type="checkbox" className="sr-only" checked={categories.includes(c)} onChange={() => setCategories((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))} />
                {c.replace(/_/g, " ").toLowerCase()}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={busy} className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60">
          {busy ? "Running pipeline…" : "Run pipeline (dry run)"}
        </button>
      </form>

      {result && (
        <div className="card-surface mt-6 p-5" aria-live="polite">
          <h2 className="font-display text-lg font-semibold text-forest-700">{result.ok ? "Pipeline succeeded" : "Pipeline stopped"}</h2>
          {result.error && <p className="mt-2 text-sm text-terracotta-700">{result.error}</p>}
          {result.note && <p className="mt-1 text-xs text-charcoal-light">{result.note}</p>}
          <ol className="mt-3 space-y-1.5 text-sm">
            {result.steps.map((s) => (
              <li key={s.step}><span className={`font-semibold ${STATUS_STYLE[s.status]}`}>{s.status}</span> · {s.step} — <span className="text-charcoal-light">{s.detail}</span></li>
            ))}
          </ol>
          {result.content && (
            <p className="mt-3 text-xs text-charcoal-light">
              Generated {result.content.sections} sections · fact-check {result.content.fact_check}
              {result.content.seo_issues.length > 0 && ` · ${result.content.seo_issues.map((i) => `${i.severity}: ${i.message}`).join("; ")}`}
            </p>
          )}
          {result.page_url && <p className="mt-2 text-xs text-charcoal-light">Page would be served at <code className="rounded bg-forest-100 px-1">{result.page_url}</code></p>}
        </div>
      )}
    </div>
  );
}
