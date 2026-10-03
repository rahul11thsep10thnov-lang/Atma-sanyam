/**
 * Offline test of the image discovery service: global fetch is replaced with recorded-format responses
 * (MediaWiki API formatversion=2, Pixabay API, Unsplash API), so the adapters, licence checks, quality
 * screen, de-duplication, fallback and status reporting can be checked without network access.
 * Run: npm run test:discovery
 */
import { discoverImages, newRunContext } from "../lib/cms/discovery";
import { DEFAULT_SETTINGS } from "../lib/cms/types";
import type { Subject } from "../lib/cms/discovery/types";
import { setSecret, getSecret } from "../lib/cms/secrets";

let failed = 0;
let passed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "  ok  " : "FAIL  "} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
};

const meta = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const commonsPage = (pageid: number, title: string, o: { license?: string; artist?: string; w?: number; h?: number; mime?: string; desc?: string; cats?: string; nonFree?: boolean; lat?: number; lon?: number }) => ({
  pageid, ns: 6, title: `File:${title}`,
  ...(o.lat != null ? { coordinates: [{ lat: o.lat, lon: o.lon, primary: true, globe: "earth" }] } : {}),
  imageinfo: [{
    url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    descriptionurl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replace(/ /g, "_"))}`,
    thumburl: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${encodeURIComponent(title.replace(/ /g, "_"))}/480px-${encodeURIComponent(title.replace(/ /g, "_"))}`,
    width: o.w ?? 4000, height: o.h ?? 3000, mime: o.mime ?? "image/jpeg",
    extmetadata: meta({
      ...(o.license !== undefined ? { LicenseShortName: o.license } : { LicenseShortName: "CC BY-SA 4.0" }),
      LicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      Artist: o.artist ?? '<a href="//commons.wikimedia.org/wiki/User:Photographer">Photographer</a>',
      AttributionRequired: "true",
      ImageDescription: o.desc ?? "",
      Categories: o.cats ?? "",
      ...(o.nonFree ? { NonFree: "true" } : {})
    })
  }]
});

const COMMONS = [
  commonsPage(1, "Kashi Vishwanath Temple Varanasi 01.jpg", { desc: "Kashi Vishwanath Temple in Varanasi", cats: "Kashi Vishwanath Temple|Quality images" }),
  commonsPage(2, "Kashi Vishwanath Temple Varanasi 02.jpg", { desc: "Gate of the Kashi Vishwanath Temple" }),
  commonsPage(3, "Kashi Vishwanath Temple map.png", { mime: "image/png", desc: "Map" }),
  commonsPage(4, "Kashi Vishwanath small.jpg", { w: 640, h: 480, desc: "Kashi Vishwanath Temple Varanasi" }),
  commonsPage(5, "Kashi Vishwanath Temple logo.jpg", { desc: "Kashi Vishwanath Temple Varanasi logo" }),
  commonsPage(6, "Kashi Vishwanath Temple fair use.jpg", { license: "Fair use", nonFree: true, desc: "Kashi Vishwanath Temple Varanasi" }),
  commonsPage(7, "Mahakaleshwar Ujjain.jpg", { desc: "Mahakaleshwar temple in Ujjain" }),
  commonsPage(8, "Kashi Vishwanath Temple Varanasi 03.jpg", { desc: "Kashi Vishwanath Temple at night, Varanasi", lat: 25.3109, lon: 83.0107 }),
  commonsPage(9, "Kashi Vishwanath Temple no licence.jpg", { license: "", desc: "Kashi Vishwanath Temple Varanasi" }),
  // Same file reached through a second listing (different page id, same file URL) → duplicate.
  commonsPage(10, "Kashi Vishwanath Temple Varanasi 01.jpg", { desc: "Kashi Vishwanath Temple Varanasi, same file" })
];

const PIXABAY = {
  total: 3, totalHits: 3,
  hits: [
    { id: 501, pageURL: "https://pixabay.com/photos/varanasi-temple-501/", type: "photo", tags: "varanasi, kashi vishwanath, temple", previewURL: "https://cdn.pixabay.com/p/501_150.jpg", webformatURL: "https://pixabay.com/get/501_640.jpg", largeImageURL: "https://pixabay.com/get/501_1280.jpg", imageWidth: 5000, imageHeight: 3333, user: "traveller", user_id: 42 },
    { id: 502, pageURL: "https://pixabay.com/photos/temple-ai-502/", type: "photo", tags: "varanasi, kashi vishwanath, ai generated", previewURL: "", webformatURL: "https://pixabay.com/get/502_640.jpg", largeImageURL: "https://pixabay.com/get/502_1280.jpg", imageWidth: 4000, imageHeight: 3000, user: "gen", user_id: 7 },
    { id: 503, pageURL: "https://pixabay.com/illustrations/503/", type: "illustration", tags: "varanasi, kashi vishwanath", previewURL: "", webformatURL: "https://pixabay.com/get/503_640.jpg", largeImageURL: "https://pixabay.com/get/503_1280.jpg", imageWidth: 4000, imageHeight: 3000, user: "art", user_id: 8 }
  ]
};

let mode: "ok" | "commons403" = "ok";
const calls: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  calls.push(url);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (url.startsWith("https://commons.wikimedia.org/w/api.php")) {
    if (mode === "commons403") return new Response("Forbidden", { status: 403 });
    return json({ batchcomplete: true, query: { pages: url.includes("geosearch") ? [COMMONS[7]] : COMMONS } });
  }
  if (url.startsWith("https://pixabay.com/api/")) return json(PIXABAY);
  if (/upload\.wikimedia\.org|pixabay\.com\/get/.test(url)) return new Response(new Uint8Array([0xff, 0xd8]), { status: 206, headers: { "content-type": "image/jpeg" } });
  return new Response("not mocked", { status: 404 });
}) as typeof fetch;

async function main() {
  const savedKey = getSecret("pixabay");
  if (!savedKey) setSecret("pixabay", "test-key");
  process.env.CMS_DISCOVERY_NO_CACHE = "1";
  const settings = { ...DEFAULT_SETTINGS, image_providers: { wikimedia: { enabled: true }, pixabay: { enabled: true }, unsplash: { enabled: false }, pexels: { enabled: false } } };
  const subject: Subject = { kind: "attraction", name: "Kashi Vishwanath Temple", city: "Varanasi", cityAliases: [], state: "Uttar Pradesh", lat: 25.3109, lon: 83.0107, otherPlaces: ["Ujjain", "Agra"] };

  const r = await discoverImages(subject, settings, newRunContext());
  const ids = r.candidates.map((c) => c.id);
  const reasons = Object.fromEntries(r.rejected.map((x) => [x.id, x.rejection_reason ?? ""]));
  console.log("Discovery with both providers reachable");
  check("Commons photos of the attraction are kept", ids.includes("wm-1") && ids.includes("wm-2") && ids.includes("wm-8"), ids.join(","));
  check("Pixabay photo of the attraction is kept", ids.includes("pb-501"), ids.join(","));
  check("PNG map rejected as not a photograph", /NOT_A_PHOTO/.test(reasons["wm-3"] ?? ""), reasons["wm-3"]);
  check("small image rejected", /LOW_RESOLUTION/.test(reasons["wm-4"] ?? ""), reasons["wm-4"]);
  check("logo rejected", /LOGO_OR_WATERMARK/.test(reasons["wm-5"] ?? ""), reasons["wm-5"]);
  check("non-free licence rejected", /NON_FREE_LICENSE/.test(reasons["wm-6"] ?? ""), reasons["wm-6"]);
  check("other city rejected", /WRONG_LOCATION|IRRELEVANT/.test(reasons["wm-7"] ?? ""), reasons["wm-7"]);
  check("missing licence rejected", /MISSING_LICENSE/.test(reasons["wm-9"] ?? ""), reasons["wm-9"]);
  check("AI-generated Pixabay image rejected", /AI_GENERATED/.test(reasons["pb-502"] ?? ""), reasons["pb-502"]);
  check("Pixabay illustration rejected", /NOT_A_PHOTO/.test(reasons["pb-503"] ?? ""), reasons["pb-503"]);
  check("the same file reached twice is de-duplicated", !ids.includes("wm-10") && /DUPLICATE/.test(reasons["wm-10"] ?? ""), reasons["wm-10"]);
  check("a photographer's series (same size, numbered titles) is not treated as duplicates", ids.includes("wm-1") && ids.includes("wm-2"));
  check("candidates carry provider, licence, photographer, source page and query", r.candidates.every((c) => c.provider && c.license && c.photographer && c.source_page_url && c.source_query && c.discovered_at));
  check("Commons artist link and attribution text are recorded", r.candidates.find((c) => c.id === "wm-1")?.photographer_url === "https://commons.wikimedia.org/wiki/User:Photographer" && /via Wikimedia Commons/.test(r.candidates.find((c) => c.id === "wm-1")?.attribution_text ?? ""));
  check("best match (named + quality image) ranks first", r.candidates[0]?.id === "wm-1" || r.candidates[0]?.id === "wm-8", r.candidates.map((c) => `${c.id}:${c.relevance_score}`).join(" "));
  check("search status COMPLETED with per-provider counts", r.state.status === "COMPLETED" && r.state.providers.find((p) => p.provider === "wikimedia")!.found > 0 && r.state.providers.find((p) => p.provider === "pixabay")!.kept === 1, JSON.stringify(r.state.providers));
  check("never more than the target number of candidates", r.candidates.length <= settings.images_per_attraction);
  check("Pixabay key is not in any stored URL", !JSON.stringify(r).includes("key="));

  console.log("Fallback when Commons answers 403");
  mode = "commons403";
  const ctx = newRunContext();
  const r2 = await discoverImages({ ...subject, lat: null, lon: null }, settings, ctx);
  check("Commons marked PROVIDER_UNAVAILABLE, pipeline continues with Pixabay", r2.state.providers.find((p) => p.provider === "wikimedia")?.status === "PROVIDER_UNAVAILABLE" && r2.candidates.some((c) => c.provider === "pixabay"));
  check("search status PARTIAL", r2.state.status === "PARTIAL", r2.state.status);
  const before = calls.filter((u) => u.includes("commons.wikimedia.org")).length;
  await discoverImages({ ...subject, name: "Dashashwamedh Ghat" }, settings, ctx);
  check("an unavailable provider is not retried for the rest of the run", calls.filter((u) => u.includes("commons.wikimedia.org")).length === before);

  if (!savedKey) setSecret("pixabay", null);
  globalThis.fetch = realFetch;
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

void main();
