"use client";

import { useEffect, useState } from "react";
import { API_URL, liveApiEnabled } from "@/lib/liveApi";

/** Website settings an admin edits in the console (Settings → Website). The
 * same defaults live in backend/src/services/siteSettingsService.ts. */
export interface SiteSettings {
  quote: string;
  quoteAttribution: string;
  plan: { name: string; priceInr: number; listPriceInr: number; durationDays: number };
  freeQuota: { full: number; subject: number };
  popup: { enabled: boolean; title: string; body: string; cta: string };
}

export const DEFAULT_SITE: SiteSettings = {
  quote: "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः",
  quoteAttribution: "हितोपदेश",
  plan: { name: "Mock Test Pass", priceInr: 49, listPriceInr: 299, durationDays: 365 },
  freeQuota: { full: 2, subject: 2 },
  popup: {
    enabled: true,
    title: "कम समय में अपनी तैयारी परखिये",
    body: "बहुत कठिन प्रश्न देकर न हम शक्ति प्रदर्शन करेंगे, न बहुत आसान प्रश्न देकर आपकी तैयारी का गलत मूल्यांकन करेंगे। सटीक प्रश्नों से अपनी तैयारी का सही स्तर जानिए।",
    cta: "हमसे जुड़िये",
  },
};

let cached: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;
const listeners = new Set<(s: SiteSettings) => void>();

export function loadSiteSettings(): Promise<SiteSettings> {
  if (cached) return Promise.resolve(cached);
  if (!liveApiEnabled) return Promise.resolve(DEFAULT_SITE);
  inflight ??= fetch(`${API_URL}/api/site`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      cached = data ? { ...DEFAULT_SITE, ...(data as Partial<SiteSettings>) } : DEFAULT_SITE;
      listeners.forEach((l) => l(cached!));
      return cached;
    })
    .catch(() => DEFAULT_SITE)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useSiteSettings(): SiteSettings {
  const [site, setSite] = useState<SiteSettings>(() => cached ?? DEFAULT_SITE);
  useEffect(() => {
    listeners.add(setSite);
    void loadSiteSettings().then(setSite);
    return () => {
      listeners.delete(setSite);
    };
  }, []);
  return site;
}
