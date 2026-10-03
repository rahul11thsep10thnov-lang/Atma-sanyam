import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json } from "@/lib/api/http";
import { getSettings, saveSettings } from "@/lib/cms/store";
import type { SiteSettings } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

/** Site-wide settings. API keys are not part of these — they are managed (write-only) under /api/admin/cms/providers. */
const STRING_KEYS = ["site_name", "tagline", "logo_url", "favicon_url", "default_hero_image", "default_seo_title", "default_seo_description", "contact_email", "contact_phone", "contact_address", "footer_text", "copyright_text", "analytics_id"] as const;

const clampInt = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.trunc(v))) : undefined);

export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  return json({ settings: getSettings() });
}

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
    if (v === null || v === "") { (patch as Record<string, unknown>)[k] = null; continue; }
    if (typeof v === "string") (patch as Record<string, unknown>)[k] = v.trim().slice(0, 1000);
  }
  if (patch.site_name === null) delete patch.site_name;
  if (patch.copyright_text === null) patch.copyright_text = "";
  if (Array.isArray(body.social_links)) {
    patch.social_links = body.social_links
      .filter((l): l is { label: string; url: string } => Boolean(l) && typeof (l as { label?: unknown }).label === "string" && typeof (l as { url?: unknown }).url === "string")
      .map((l) => ({ label: l.label.trim().slice(0, 60), url: l.url.trim().slice(0, 500) }))
      .filter((l) => l.label && /^https?:\/\//.test(l.url))
      .slice(0, 12);
  }
  const n = {
    images_per_attraction: clampInt(body.images_per_attraction, 4, 20),
    min_image_long_edge: clampInt(body.min_image_long_edge, 600, 4000),
    attractions_per_destination: clampInt(body.attractions_per_destination, 3, 30),
    prepare_ahead: clampInt(body.prepare_ahead, 0, 5)
  };
  for (const [k, v] of Object.entries(n)) if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
  if (body.on_finalize === "READY" || body.on_finalize === "PUBLISH") patch.on_finalize = body.on_finalize;
  return json({ settings: saveSettings(patch) });
}
