"use client";

import { useState } from "react";
import type { SiteSettings } from "@/lib/cms/types";
import { api, btnPrimary, btnSecondary, field, label, Notice } from "./ui";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const text = (k: keyof SiteSettings) => ({ value: (s[k] as string | null) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS((p) => ({ ...p, [k]: e.target.value })) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { settings } = await api<{ settings: SiteSettings }>("/api/admin/cms/settings", { method: "PUT", body: JSON.stringify(s) });
      setS(settings);
      setMsg({ tone: "ok", text: "Settings saved. Public pages pick them up on the next request." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="card-surface p-5">
      <h2 className="font-display text-lg font-semibold text-forest-700">{title}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );

  return (
    <form onSubmit={save} className="space-y-5">
      <Section title="Site identity">
        <label className={label}>Site name<input {...text("site_name")} className={field} /></label>
        <label className={label}>Tagline (homepage headline)<input {...text("tagline")} className={field} /></label>
        <label className={label}>Logo URL<input {...text("logo_url")} className={field} placeholder="/images/logo.svg" /></label>
        <label className={label}>Favicon URL<input {...text("favicon_url")} className={field} placeholder="/favicon.ico" /></label>
        <label className={`${label} sm:col-span-2`}>Default hero / homepage background image<input {...text("default_hero_image")} className={field} /></label>
      </Section>
      <Section title="Default SEO">
        <label className={`${label} sm:col-span-2`}>Default title<input {...text("default_seo_title")} className={field} /></label>
        <label className={`${label} sm:col-span-2`}>Default description<textarea rows={2} {...text("default_seo_description")} className={field} /></label>
        <label className={label}>Analytics ID<input {...text("analytics_id")} className={field} placeholder="G-XXXXXXX" /></label>
      </Section>
      <Section title="Contact and footer">
        <label className={label}>Contact email<input {...text("contact_email")} className={field} /></label>
        <label className={label}>Contact phone<input {...text("contact_phone")} className={field} /></label>
        <label className={`${label} sm:col-span-2`}>Address<input {...text("contact_address")} className={field} /></label>
        <label className={`${label} sm:col-span-2`}>Footer text<textarea rows={2} {...text("footer_text")} className={field} /></label>
        <label className={label}>Copyright text<input {...text("copyright_text")} className={field} /></label>
        <div className="sm:col-span-2">
          <p className={label}>Social links</p>
          <div className="mt-1 space-y-2">
            {s.social_links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input value={l.label} placeholder="Label" className={field} onChange={(e) => setS((p) => ({ ...p, social_links: p.social_links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
                <input value={l.url} placeholder="https://…" className={field} onChange={(e) => setS((p) => ({ ...p, social_links: p.social_links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) }))} />
                <button type="button" className={btnSecondary} onClick={() => setS((p) => ({ ...p, social_links: p.social_links.filter((_, j) => j !== i) }))}>Remove</button>
              </div>
            ))}
            <button type="button" className={btnSecondary} onClick={() => setS((p) => ({ ...p, social_links: [...p.social_links, { label: "", url: "" }] }))}>+ Add link</button>
          </div>
        </div>
      </Section>
      <Section title="Content pipeline">
        <label className={label}>Attractions per destination<input type="number" min={3} max={30} value={s.attractions_per_destination} onChange={(e) => setS((p) => ({ ...p, attractions_per_destination: Number(e.target.value) }))} className={field} /></label>
        <label className={label}>Image candidates per attraction (target)<input type="number" min={4} max={20} value={s.images_per_attraction} onChange={(e) => setS((p) => ({ ...p, images_per_attraction: Number(e.target.value) }))} className={field} /></label>
        <label className={label}>Minimum image size (longer side, px)<input type="number" min={600} max={4000} step={100} value={s.min_image_long_edge} onChange={(e) => setS((p) => ({ ...p, min_image_long_edge: Number(e.target.value) }))} className={field} /></label>
        <label className={label}>Destinations prepared ahead in the background<input type="number" min={0} max={5} value={s.prepare_ahead} onChange={(e) => setS((p) => ({ ...p, prepare_ahead: Number(e.target.value) }))} className={field} /></label>
        <label className={`${label} sm:col-span-2`}>When I finalise a destination
          <select value={s.on_finalize} onChange={(e) => setS((p) => ({ ...p, on_finalize: e.target.value as SiteSettings["on_finalize"] }))} className={field}>
            <option value="READY">Mark the page ready for review (publish later from the destinations table)</option>
            <option value="PUBLISH">Publish the page immediately</option>
          </select>
        </label>
        <p className="text-xs text-charcoal-light sm:col-span-2">Fewer candidates than the target are shown when fewer trustworthy images exist — the list is never padded. Destinations already published stay published when finalised again.</p>
      </Section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
