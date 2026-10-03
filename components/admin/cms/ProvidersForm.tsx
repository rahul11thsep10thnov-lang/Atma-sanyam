"use client";

import Link from "next/link";
import { useState } from "react";
import type { ImageProviderId, ProviderRunStatus } from "@/lib/cms/types";
import { api, Badge, btnPrimary, btnSecondary, field, Notice } from "./ui";

interface KeyStatus {
  configured: boolean;
  source: "environment" | "saved" | null;
}
interface ProviderRow {
  id: ImageProviderId;
  label: string;
  enabled: boolean;
  needs_key: boolean;
  key: KeyStatus | null;
  ready: { usable: boolean; status: ProviderRunStatus | null; note: string | null };
}
interface Listing {
  providers: ProviderRow[];
  google_places: KeyStatus;
  contact_email: string | null;
}

const NOTES: Record<ImageProviderId, string> = {
  wikimedia: "Real photographs of the actual places, CC / public-domain licences only. No key needed — requests identify the site and its contact email, as Wikimedia's API policy asks. Approved files are copied to the site's media storage.",
  pixabay: "Pixabay Content License. Results are cached for 24 h (required by Pixabay). Pixabay URLs are only used on the review screen — approved images are downloaded to the site's storage, never hotlinked.",
  unsplash: "Optional. Unsplash photos are hotlinked from Unsplash (as their API terms require), credited “Photo by … on Unsplash” with links, and the download event is reported on approval. Demo apps are limited to 50 requests/hour — Unsplash is only queried when the other providers found too few candidates.",
  pexels: "Not in use for now (no API key). Enable it here once you have a key."
};

const keyLabel = (k: KeyStatus | null) => (!k ? "No key needed" : !k.configured ? "Not configured" : k.source === "environment" ? "Configured (environment variable)" : "Configured (saved)");

export function ProvidersForm({ initial }: { initial: Listing }) {
  const [data, setData] = useState<Listing>(initial);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { tone: "ok" | "error" | "warn"; text: string }>>({});

  async function put(provider: string, body: Record<string, unknown>) {
    setBusy(provider);
    try {
      const r = await api<Listing>("/api/admin/cms/providers", { method: "PUT", body: JSON.stringify({ provider, ...body }) });
      setData(r);
      setKeys((k) => ({ ...k, [provider]: "" }));
      setResults((x) => ({ ...x, [provider]: { tone: "ok", text: "Saved." } }));
    } catch (e) {
      setResults((x) => ({ ...x, [provider]: { tone: "error", text: e instanceof Error ? e.message : "Failed" } }));
    } finally {
      setBusy(null);
    }
  }

  async function test(provider: ImageProviderId) {
    setBusy(`test:${provider}`);
    try {
      const r = await api<{ status: ProviderRunStatus; note: string | null; results: number }>("/api/admin/cms/providers", { method: "POST", body: JSON.stringify({ provider }) });
      const tone = r.status === "OK" ? "ok" : r.status === "NO_RESULTS" ? "warn" : "error";
      const text = r.status === "OK" ? `Working — test search returned ${r.results} results.` : r.status === "PROVIDER_UNAVAILABLE" ? `PROVIDER_UNAVAILABLE — the provider could not be reached from this server${r.note ? ` (${r.note})` : ""}. The pipeline will skip it and use the others.` : `${r.status}${r.note ? ` — ${r.note}` : ""}`;
      setResults((x) => ({ ...x, [provider]: { tone, text } }));
    } catch (e) {
      setResults((x) => ({ ...x, [provider]: { tone: "error", text: e instanceof Error ? e.message : "Failed" } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {!data.contact_email && <Notice tone="warn">Wikimedia asks API clients to include a contact address. Set a contact email in <Link href="settings" className="font-semibold underline">Settings</Link> (or the WIKIMEDIA_CONTACT_EMAIL environment variable).</Notice>}
      {data.providers.map((p) => (
        <section key={p.id} className="card-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-semibold text-forest-700">{p.label}</h2>
            <Badge tone={p.enabled ? "bg-forest-100 text-forest-700" : "bg-charcoal/10 text-charcoal"}>{p.enabled ? "Enabled" : "Disabled"}</Badge>
            {p.needs_key && <Badge tone={p.key?.configured ? "bg-forest-100 text-forest-700" : "bg-saffron-100 text-saffron-700"}>{keyLabel(p.key)}</Badge>}
            {p.enabled && !p.ready.usable && <span className="text-xs text-saffron-700">Skipped by the pipeline: {p.ready.note}</span>}
            <span className="ml-auto flex gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => put(p.id, { enabled: !p.enabled })} className={btnSecondary}>{p.enabled ? "Disable" : "Enable"}</button>
              <button type="button" disabled={Boolean(busy) || !p.ready.usable} onClick={() => test(p.id)} className={btnSecondary}>{busy === `test:${p.id}` ? "Testing…" : "Test connection"}</button>
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-charcoal-light">{NOTES[p.id]}</p>
          {p.needs_key && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-[260px] flex-1 text-sm font-medium text-charcoal">{p.id === "unsplash" ? "Access Key" : "API key"} {p.key?.source === "environment" && <span className="text-xs font-normal text-charcoal-light">(the environment variable takes precedence)</span>}
                <input type="password" autoComplete="off" value={keys[p.id] ?? ""} onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))} placeholder={p.key?.configured ? "•••••••• (enter a new key to replace it)" : "Paste the key"} className={field} />
              </label>
              <button type="button" disabled={Boolean(busy) || !(keys[p.id] ?? "").trim()} onClick={() => put(p.id, { key: keys[p.id] })} className={btnPrimary}>Save key</button>
              {p.key?.source === "saved" && <button type="button" disabled={Boolean(busy)} onClick={() => confirm(`Remove the saved ${p.label} key?`) && put(p.id, { key: null })} className={btnSecondary}>Remove key</button>}
            </div>
          )}
          {p.id === "unsplash" && <p className="mt-2 text-xs text-charcoal-light">Only the Access Key is needed. Never paste the Secret Key here.</p>}
          {results[p.id] && <div className="mt-3"><Notice tone={results[p.id].tone}>{results[p.id].text}</Notice></div>}
        </section>
      ))}
      <section className="card-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-forest-700">Google Places (ratings)</h2>
          <Badge tone={data.google_places.configured ? "bg-forest-100 text-forest-700" : "bg-saffron-100 text-saffron-700"}>{keyLabel(data.google_places)}</Badge>
        </div>
        <p className="mt-2 text-sm text-charcoal-light">Used only through the official Places API for attraction ratings, review counts and Maps links. Without it, attractions show “Rating unavailable”.</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input type="password" autoComplete="off" value={keys.google_places ?? ""} onChange={(e) => setKeys((k) => ({ ...k, google_places: e.target.value }))} placeholder={data.google_places.configured ? "•••••••• (enter a new key to replace it)" : "Paste the key"} className={`${field} max-w-md`} />
          <button type="button" disabled={Boolean(busy) || !(keys.google_places ?? "").trim()} onClick={() => put("google_places", { key: keys.google_places })} className={btnPrimary}>Save key</button>
          {data.google_places.source === "saved" && <button type="button" disabled={Boolean(busy)} onClick={() => put("google_places", { key: null })} className={btnSecondary}>Remove key</button>}
        </div>
        {results.google_places && <div className="mt-3"><Notice tone={results.google_places.tone}>{results.google_places.text}</Notice></div>}
      </section>
    </div>
  );
}
