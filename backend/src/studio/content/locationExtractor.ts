import { INDIA_STATES } from "../../data/indiaLocations";
import { ExtractedLocation } from "../types";

// Visual settings a story can take place in, detected from keywords. Each
// becomes a reusable "location sheet" in the style bible so the same place
// looks the same in every scene.
export const SETTING_KEYWORDS: { setting: string; keywords: RegExp }[] = [
  { setting: "home interior", keywords: /\b(home|house|residence|room|kitchen|flat|apartment|bedroom|courtyard)\b/i },
  { setting: "police station", keywords: /\b(police station|thana|police post|chowki|police)\b/i },
  { setting: "courtroom exterior", keywords: /\b(court|magistrate|judge|bench|hearing)\b/i },
  { setting: "hospital exterior", keywords: /\b(hospital|medical college|clinic|post-mortem|postmortem|AIIMS)\b/i },
  { setting: "village lane", keywords: /\b(village|gram|panchayat|hamlet)\b/i },
  { setting: "farmland", keywords: /\b(farm|field|agricultural land|acre|bigha|crop)\b/i },
  { setting: "city street", keywords: /\b(road|street|highway|market|bazaar|crossing|colony)\b/i },
  { setting: "office exterior", keywords: /\b(office|tehsil|collectorate|registry|municipal)\b/i },
  { setting: "railway station", keywords: /\b(railway station|train|platform)\b/i },
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Stage: LOCATION EXTRACTION. Finds the state/district (matched against the
 * app's India location reference data, so Studio stories plug into the
 * same State → District filter as the rest of the app), named villages or
 * localities, and the visual settings the story moves between.
 */
export function extractLocation(text: string, hint?: { state?: string; district?: string; locationText?: string }): ExtractedLocation {
  let state = hint?.state;
  let district = hint?.district;

  if (!district || !state) {
    for (const s of INDIA_STATES) {
      for (const d of s.districts) {
        if (new RegExp(`\\b${escapeRegex(d)}\\b`, "i").test(text)) {
          district = district ?? d;
          state = state ?? s.name;
          break;
        }
      }
      if (district) break;
    }
  }
  if (!state) {
    const found = INDIA_STATES.find((s) => new RegExp(`\\b${escapeRegex(s.name)}\\b`, "i").test(text));
    state = found?.name;
  }

  const locality = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s(?:village|town|colony|locality|area|nagar)\b/)?.[0];

  const settings = SETTING_KEYWORDS.filter((s) => s.keywords.test(text)).map((s) => s.setting);
  if (settings.length === 0) settings.push("city street");

  const parts = [hint?.locationText, locality, district, state].filter((p): p is string => !!p && p.trim().length > 0);
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);

  return {
    label: unique.length > 0 ? unique.join(", ") : "India",
    state,
    district,
    settings,
  };
}
