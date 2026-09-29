/**
 * Permanent ID system (spec section 5).
 *
 *   IN               country
 *   IN-UP            state / UT            (ISO 3166-2:IN code)
 *   IN-UP-VNS        destination           (2–5 chars, unique within the state)
 *   IN-UP-VNS-KVT    attraction            (2–6 chars, unique within the destination)
 *   DIST-IN-UP-VNS   district              (prefix keeps it unambiguous from attractions)
 *
 * IDs are minted once and never derived again from names or URLs, so a
 * rename or slug change cannot break references.
 */

export const COUNTRY_ID = "IN";

const STATE_RE = /^IN-[A-Z]{2}$/;
const DESTINATION_RE = /^IN-[A-Z]{2}-[A-Z0-9]{2,5}$/;
const ATTRACTION_RE = /^IN-[A-Z]{2}-[A-Z0-9]{2,5}-[A-Z0-9]{2,6}$/;
const DISTRICT_RE = /^DIST-IN-[A-Z]{2}-[A-Z0-9]{2,6}$/;

export type IdKind = "COUNTRY" | "STATE" | "DESTINATION" | "ATTRACTION" | "DISTRICT" | "UNKNOWN";

export function idKind(id: string): IdKind {
  if (id === COUNTRY_ID) return "COUNTRY";
  if (STATE_RE.test(id)) return "STATE";
  if (DESTINATION_RE.test(id)) return "DESTINATION";
  if (ATTRACTION_RE.test(id)) return "ATTRACTION";
  if (DISTRICT_RE.test(id)) return "DISTRICT";
  return "UNKNOWN";
}

export const stateId = (stateCode: string) => `${COUNTRY_ID}-${stateCode.toUpperCase()}`;
export const destinationId = (stateCode: string, code: string) => `${stateId(stateCode)}-${code.toUpperCase()}`;
export const attractionId = (destId: string, code: string) => `${destId}-${code.toUpperCase()}`;
export const districtId = (stateCode: string, code: string) => `DIST-${stateId(stateCode)}-${code.toUpperCase()}`;

/** Extracts the parent ID from any hierarchical ID (attraction → destination → state → country). */
export function parentId(id: string): string | null {
  switch (idKind(id)) {
    case "ATTRACTION":
    case "DESTINATION":
    case "STATE":
      return id.split("-").slice(0, -1).join("-");
    default:
      return null;
  }
}

/** Mints a short code from a name, guaranteed not to collide with `taken`. Used for new records only. */
export function mintCode(name: string, taken: Set<string>, minLen = 3, maxLen = 5): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.join("");
  const initials = words.map((w) => w[0]).join("");

  const candidates: string[] = [];
  if (initials.length >= minLen) candidates.push(initials.slice(0, maxLen));
  candidates.push(letters.slice(0, Math.max(minLen, Math.min(maxLen, letters.length))));
  candidates.push(letters.slice(0, minLen));

  for (const c of candidates) {
    if (c.length >= 2 && !taken.has(c)) return c;
  }
  const base = (letters.slice(0, maxLen - 1) || "X0").padEnd(2, "X");
  for (let i = 2; i < 100; i++) {
    const c = `${base.slice(0, maxLen - String(i).length)}${i}`;
    if (!taken.has(c)) return c;
  }
  throw new Error(`Could not mint a unique code for "${name}"`);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
