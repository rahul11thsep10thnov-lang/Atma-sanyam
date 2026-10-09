/**
 * All 28 states and 8 union territories, keyed by their ISO 3166-2:IN
 * subdivision codes (without "IN-"). `patterns` are what notices use to
 * name the state, including the usual commission abbreviations, so a
 * notice from "UPSSSC" lands under Uttar Pradesh. `priority` marks the
 * states the product focuses on first.
 */
export interface Region {
  code: string;
  name: string;
  kind: "STATE" | "UT";
  priority?: boolean;
  patterns: RegExp;
}

export const REGIONS: Region[] = [
  { code: "AP", name: "Andhra Pradesh", kind: "STATE", patterns: /\bandhra\s+pradesh\b|\bAPPSC\b|\bAPSLPRB\b/i },
  { code: "AR", name: "Arunachal Pradesh", kind: "STATE", patterns: /\barunachal\b|\bAPPSCB?\b(?=.*arunachal)/i },
  { code: "AS", name: "Assam", kind: "STATE", patterns: /\bassam\b|\bAPSC\b|\bSLPRB\s+assam\b/i },
  { code: "BR", name: "Bihar", kind: "STATE", priority: true, patterns: /\bbihar\b|\bBPSC\b|\bBSSC\b|\bBPSSC\b|\bCSBC\b|\bpatna\s+high\s+court\b/i },
  { code: "CT", name: "Chhattisgarh", kind: "STATE", priority: true, patterns: /\bchhattisgarh\b|\bCGPSC\b|\bCG\s*vyapam\b|\bCGVYAPAM\b/i },
  { code: "GA", name: "Goa", kind: "STATE", patterns: /\bgoa\b|\bGPSC\s+goa\b/i },
  { code: "GJ", name: "Gujarat", kind: "STATE", patterns: /\bgujarat\b|\bGSSSB\b|\bGPSC\b(?!\s+goa)/i },
  { code: "HR", name: "Haryana", kind: "STATE", priority: true, patterns: /\bharyana\b|\bHPSC\b|\bHSSC\b/i },
  { code: "HP", name: "Himachal Pradesh", kind: "STATE", patterns: /\bhimachal\b|\bHPPSC\b|\bHPRCA\b/i },
  { code: "JH", name: "Jharkhand", kind: "STATE", priority: true, patterns: /\bjharkhand\b|\bJPSC\b|\bJSSC\b/i },
  { code: "KA", name: "Karnataka", kind: "STATE", patterns: /\bkarnataka\b|\bKPSC\b|\bKEA\b/i },
  { code: "KL", name: "Kerala", kind: "STATE", patterns: /\bkerala\b|\bKPSC\s+kerala\b/i },
  { code: "MP", name: "Madhya Pradesh", kind: "STATE", priority: true, patterns: /\bmadhya\s+pradesh\b|\bMPPSC\b|\bMPESB\b|\bMP\s*vyapam\b/i },
  { code: "MH", name: "Maharashtra", kind: "STATE", patterns: /\bmaharashtra\b|\bMPSC\b(?!\s*(manipur|meghalaya|mizoram))/i },
  { code: "MN", name: "Manipur", kind: "STATE", patterns: /\bmanipur\b/i },
  { code: "ML", name: "Meghalaya", kind: "STATE", patterns: /\bmeghalaya\b/i },
  { code: "MZ", name: "Mizoram", kind: "STATE", patterns: /\bmizoram\b/i },
  { code: "NL", name: "Nagaland", kind: "STATE", patterns: /\bnagaland\b|\bNPSC\b/i },
  { code: "OR", name: "Odisha", kind: "STATE", patterns: /\bodisha\b|\borissa\b|\bOPSC\b|\bOSSC\b|\bOSSSC\b/i },
  { code: "PB", name: "Punjab", kind: "STATE", priority: true, patterns: /\bpunjab\b(?!\s+(national|&\s*sind|and\s+sind))|\bPPSC\b|\bPSSSB\b/i },
  { code: "RJ", name: "Rajasthan", kind: "STATE", priority: true, patterns: /\brajasthan\b|\bRPSC\b|\bRSSB\b|\bRSMSSB\b/i },
  { code: "SK", name: "Sikkim", kind: "STATE", patterns: /\bsikkim\b/i },
  { code: "TN", name: "Tamil Nadu", kind: "STATE", patterns: /\btamil\s*nadu\b|\bTNPSC\b|\bTNUSRB\b|\bTRB\s+TN\b/i },
  { code: "TG", name: "Telangana", kind: "STATE", patterns: /\btelangana\b|\bTSPSC\b|\bTGPSC\b|\bTSLPRB\b/i },
  { code: "TR", name: "Tripura", kind: "STATE", patterns: /\btripura\b|\bTPSC\b/i },
  { code: "UP", name: "Uttar Pradesh", kind: "STATE", priority: true, patterns: /\buttar\s+pradesh\b|\bUPPSC\b|\bUPSSSC\b|\bUPPRPB\b|\bUPPBPB\b|\bU\.?P\.?\s+police\b|\ballahabad\s+high\s+court\b/i },
  { code: "UT", name: "Uttarakhand", kind: "STATE", priority: true, patterns: /\buttarakhand\b|\buttaranchal\b|\bUKPSC\b|\bUKSSSC\b/i },
  { code: "WB", name: "West Bengal", kind: "STATE", patterns: /\bwest\s+bengal\b|\bWBPSC\b|\bWBSSC\b|\bWBPRB\b/i },
  { code: "AN", name: "Andaman and Nicobar Islands", kind: "UT", patterns: /\bandaman\b|\bnicobar\b/i },
  { code: "CH", name: "Chandigarh", kind: "UT", patterns: /\bchandigarh\b(?!.*\bRRB\b)/i },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu", kind: "UT", patterns: /\bdadra\b|\bdaman\b|\bdiu\b/i },
  { code: "DL", name: "Delhi", kind: "UT", patterns: /\bdelhi\b(?!\s+university)|\bDSSSB\b/i },
  { code: "JK", name: "Jammu and Kashmir", kind: "UT", patterns: /\bjammu\b|\bkashmir\b|\bJKPSC\b|\bJKSSB\b/i },
  { code: "LA", name: "Ladakh", kind: "UT", patterns: /\bladakh\b/i },
  { code: "LD", name: "Lakshadweep", kind: "UT", patterns: /\blakshadweep\b/i },
  { code: "PY", name: "Puducherry", kind: "UT", patterns: /\bpuducherry\b|\bpondicherry\b/i },
];

export const REGION_BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));
export const PRIORITY_REGION_CODES = REGIONS.filter((r) => r.priority).map((r) => r.code);

export function isRegionCode(code: string | null | undefined): boolean {
  return !!code && REGION_BY_CODE.has(code);
}

/**
 * The state/UT a notice belongs to, from its organization name and title
 * first (most reliable), then the opening of the text. Returns null when
 * nothing matches or when more than one state matches equally — a wrong
 * state is worse than none.
 */
export function detectStateCode(parts: { organization?: string | null; title?: string | null; text?: string | null }): string | null {
  for (const chunk of [parts.organization, parts.title, parts.text?.slice(0, 1500)]) {
    if (!chunk) continue;
    const hits = REGIONS.filter((r) => r.patterns.test(chunk));
    if (hits.length === 1) return hits[0].code;
    if (hits.length > 1) {
      // "Patna High Court" also says "Bihar"; several hits for one state are fine.
      const codes = new Set(hits.map((h) => h.code));
      if (codes.size === 1) return hits[0].code;
      return null;
    }
  }
  return null;
}
