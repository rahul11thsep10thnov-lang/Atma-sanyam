import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json } from "@/lib/api/http";
import { getSettings, saveSettings } from "@/lib/cms/store";
import type { SiteSettings } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

const STRING_KEYS = ["site_name", "tagline", "logo_url", "favicon_url", "default_hero_image", "default_seo_title", "default_seo_description", "contact_email", "contact_phone", "contact_address", "footer_text", "copyright_text", "google_places_api_key", "unsplash_access_key", "pexels_api_key", "pixabay_api_key", "analytics_id"] as const;

function mask(s: SiteSettings): SiteSettings {
  const hide = (v: string | null) => (v ? `${"•".repeat(8)}${v.slice(-4)}` : null);
  return { ...s, google_places_api_key: hide(s.google_places_api_key), unsplash_access_key: hide(s.unsplash_access_key), pexels_api_key: hide(s.pexels_api_key), pixabay_api_key: hide(s.pixabay_api_key) };
}

export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  const s = getSettings();
  return json({ settings: mask(s), env_keys: { google_places: Boolean(process.env.GOOGLE_PLACES_API_KEY), unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY), pexels: Boolean(process.env.PEXELS_API_KEY), pixabay: Boolean(process.env.PIXABAY_API_KEY) } });
}

/** PUT /api/admin/cms/settings — partial update; masked key values ("••••1234") are ignored so a save never overwrites a key with its mask. */
export async function PUT(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const patch: Partial<SiteSettings> = {};
  for (const k of STRING_KEYS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === "") { patch[k] = null as never; continue; }
    if (typeof v !== "string") continue;
    if (v.startsWith("••••")) continue;
    patch[k] = v.trim().slice(0, 1000) as never;
  }
  if (typeof patch.site_name === "string" && !patch.site_name) delete patch.site_name;
  if (Array.isArray(body.social_links)) {
    patch.social_links = body.social_links
      .filter((l): l is { label: string; url: string } => Boolean(l) && typeof (l as { label?: unknown }).label === "string" && typeof (l as { url?: unknown }).url === "string")
      .map((l) => ({ label: l.label.trim().slice(0, 60), url: l.url.trim().slice(0, 500) }))
      .filter((l) => l.label && /^https?:\/\//.test(l.url))
      .slice(0, 12);
  }
  if (body.image_sources && typeof body.image_sources === "object") {
    const cur = getSettings().image_sources;
    const src = body.image_sources as Record<string, unknown>;
    patch.image_sources = {
      wikimedia_commons: typeof src.wikimedia_commons === "boolean" ? src.wikimedia_commons : cur.wikimedia_commons,
      unsplash: typeof src.unsplash === "boolean" ? src.unsplash : cur.unsplash,
      pexels: typeof src.pexels === "boolean" ? src.pexels : cur.pexels,
      pixabay: typeof src.pixabay === "boolean" ? src.pixabay : cur.pixabay
    };
  }
  if (typeof body.images_per_attraction === "number" && Number.isFinite(body.images_per_attraction)) patch.images_per_attraction = Math.min(20, Math.max(4, Math.trunc(body.images_per_attraction)));
  return json({ settings: mask(saveSettings(patch)) });
}
