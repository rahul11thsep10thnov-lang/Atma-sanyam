import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getFelicitationSettings } from "@/lib/felicitation/settings";
import { saveSettingsAction } from "../actions";

export const metadata: Metadata = { title: "Felicitation Board settings" };
const input = "mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const sp = await searchParams;
  const s = await getFelicitationSettings();
  const now = new Date();
  const live = await prisma.felicitationEntry.findMany({ where: { status: { in: ["APPROVED", "SCHEDULED", "BROADCASTING"] }, expiresAt: { gt: now } }, select: { id: true, candidateName: true, examName: true, refCode: true }, orderBy: { approvedAt: "asc" } });
  const box = (name: string, label: string, checked: boolean, hint?: string) => (
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={checked} className="mt-1" /><span>{label}{hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}</span></label>
  );
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link href="/admin/felicitation" className="text-xs text-slate-500 hover:underline">← Felicitation Board</Link>
      <h1 className="text-xl font-semibold">Felicitation Board settings</h1>
      {sp.saved ? <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Settings saved. The board picks them up within a minute.</p> : null}
      {sp.error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p> : null}
      <form action={saveSettingsAction} className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5">
        <fieldset className="flex flex-col gap-2"><legend className="mb-1 text-xs font-semibold uppercase text-slate-500">Board</legend>
          {box("enabled", "Felicitation Board enabled", s.enabled, "Off hides the board and the submission tab everywhere.")}
          {box("pausedAll", "Pause all broadcasts", s.pausedAll, "Entries keep their time; nothing is shown until resumed.")}
          {box("autoRotate", "Automatically rotate approved entries", s.autoRotate, "Off shows only the first entry (or the featured one).")}
          {box("animationsEnabled", "Celebration animations", s.animationsEnabled, "Visitors who prefer reduced motion never see animations.")}
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="text-xs text-slate-600">Seconds per entry<input type="number" name="broadcastSeconds" min={3} max={60} defaultValue={s.broadcastSeconds} className={input} /></label>
          <label className="text-xs text-slate-600">Listing duration (hours)<input type="number" name="listingHours" min={1} max={720} defaultValue={s.listingHours} className={input} /></label>
          <label className="text-xs text-slate-600">Max entries per cycle<input type="number" name="maxEntriesPerCycle" min={1} max={100} defaultValue={s.maxEntriesPerCycle} className={input} /></label>
          <label className="text-xs text-slate-600">Celebration intensity<select name="celebrationIntensity" defaultValue={s.celebrationIntensity} className={input}><option value="subtle">Subtle</option><option value="normal">Normal</option><option value="festive">Festive</option></select></label>
          <label className="text-xs text-slate-600">Price (₹, charged)<input type="number" name="priceRupees" min={1} defaultValue={s.priceRupees} className={input} /></label>
          <label className="text-xs text-slate-600">Reference price (₹, struck out)<input type="number" name="referencePriceRupees" min={0} defaultValue={s.referencePriceRupees} className={input} /></label>
        </div>
        <label className="text-xs text-slate-600">Featured entry (shown alone while it is live)
          <select name="featuredEntryId" defaultValue={s.featuredEntryId ?? ""} className={input}>
            <option value="">— none: rotate all eligible entries —</option>
            {live.map((e) => <option key={e.id} value={e.id}>{e.candidateName} — {e.examName} ({e.refCode})</option>)}
          </select>
        </label>
        <p className="text-xs text-slate-500">Display order is set per entry on the board list (lower numbers first).</p>
        <button className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">Save settings</button>
      </form>
    </div>
  );
}
