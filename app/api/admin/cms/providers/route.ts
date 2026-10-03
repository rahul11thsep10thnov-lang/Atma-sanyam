import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, rateLimit } from "@/lib/api/http";
import { ADAPTERS, providerReady, testProvider } from "@/lib/cms/discovery";
import { secretStatus, setSecret, type SecretName } from "@/lib/cms/secrets";
import { getSettings, saveSettings } from "@/lib/cms/store";
import { IMAGE_PROVIDERS, PROVIDER_LABEL, type ImageProviderId } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

const isProvider = (v: unknown): v is ImageProviderId => typeof v === "string" && (IMAGE_PROVIDERS as readonly string[]).includes(v);

/** Provider list for the admin. Key values are never returned — only whether one is configured and where from. */
function listing() {
  const s = getSettings();
  return {
    providers: IMAGE_PROVIDERS.map((id) => ({
      id,
      label: PROVIDER_LABEL[id],
      enabled: Boolean(s.image_providers[id]?.enabled),
      needs_key: ADAPTERS[id].needsKey,
      key: ADAPTERS[id].needsKey ? secretStatus(id as SecretName) : null,
      ready: providerReady(id, s)
    })),
    google_places: secretStatus("google_places"),
    contact_email: s.contact_email
  };
}

export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  return json(listing());
}

/** PUT { provider: id | "google_places", enabled?: boolean, key?: string | null } — key: string saves, null clears, absent leaves as is. */
export async function PUT(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  let body: { provider?: unknown; enabled?: unknown; key?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (body.provider === "google_places") {
    if (body.key === null || typeof body.key === "string") setSecret("google_places", body.key as string | null);
    return json(listing());
  }
  if (!isProvider(body.provider)) return badRequest("provider must be one of wikimedia, pixabay, unsplash, pexels, google_places");
  const id = body.provider;
  if (typeof body.enabled === "boolean") {
    const s = getSettings();
    saveSettings({ image_providers: { ...s.image_providers, [id]: { enabled: body.enabled } } });
  }
  if (ADAPTERS[id].needsKey && (body.key === null || typeof body.key === "string")) setSecret(id as SecretName, body.key as string | null);
  return json(listing());
}

/** POST { provider } — one small live search through the provider, to check reachability and the key. */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  const limited = rateLimit(request, "provider-test", 10);
  if (limited) return limited;
  let body: { provider?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!isProvider(body.provider)) return badRequest("Unknown provider");
  return json({ provider: body.provider, ...(await testProvider(body.provider)) });
}
