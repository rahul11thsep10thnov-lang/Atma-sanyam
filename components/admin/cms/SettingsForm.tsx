"use client";

import { useState } from "react";
import type { SiteSettings } from "@/lib/cms/types";
import { api, btnPrimary, btnSecondary, field, label, Notice } from "./ui";

type EnvKeys = { google_places: boolean; unsplash: boolean; pexels: boolean; pixabay: boolean };

export function SettingsForm({ initial, envKeys }: { initial: SiteSettings; envKeys: EnvKeys }) {
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
  const keyHint = (env: boolean) => (env ? <span className="ml-2 text-xs text-forest-700">set via environment variable (takes precedence)</span> : null);

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
      <Section title="Rating source (Google Places API)">
        <label className={`${label} sm:col-span-2`}>Google Places API key{keyHint(envKeys.google_places)}<input {...text("google_places_api_key")} className={field} placeholder="Leave blank to show “Rating unavailable”" /></label>
        <p className="text-xs text-charcoal-light sm:col-span-2">Ratings are only read through the official Places API. Without a key, the pipeline never invents a rating — attractions show “Rating unavailable”.</p>
      </Section>
      <Section title="Image sources">
        {(["wikimedia_commons", "unsplash", "pexels", "pixabay"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm text-charcoal"><input type="checkbox" checked={s.image_sources[k]} onChange={(e) => setS((p) => ({ ...p, image_sources: { ...p.image_sources, [k]: e.target.checked } }))} />{k === "wikimedia_commons" ? "Wikimedia Commons (free licences only)" : k[0].toUpperCase() + k.slice(1)}</label>
        ))}
        <label className={label}>Unsplash access key{keyHint(envKeys.unsplash)}<input {...text("unsplash_access_key")} className={field} /></label>
        <label className={label}>Pexels API key{keyHint(envKeys.pexels)}<input {...text("pexels_api_key")} className={field} /></label>
        <label className={label}>Pixabay API key{keyHint(envKeys.pixabay)}<input {...text("pixabay_api_key")} className={field} /></label>
        <label className={label}>Candidate images per attraction<input type="number" min={4} max={20} value={s.images_per_attraction} onChange={(e) => setS((p) => ({ ...p, images_per_attraction: Number(e.target.value) }))} className={field} /></label>
        <p className="text-xs text-charcoal-light sm:col-span-2">Keys are stored in <code>data/cms/settings.json</code>; a saved key is shown masked and is kept unless you type a new one. Only images whose licence permits publication are ever collected.</p>
      </Section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
