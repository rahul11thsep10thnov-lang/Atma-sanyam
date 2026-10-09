import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validation/shared";
import { parserConfigSchema, paginationConfigSchema } from "@/lib/pipeline/parsers/config";
import { isRegionCode } from "@/lib/sources/regions";

export const SOURCE_TYPES = ["HTML", "RSS", "ATOM", "JSON", "SITEMAP", "PDF", "API", "XML"] as const;
export const SOURCE_PRIORITIES = ["HIGH", "NORMAL", "LOW"] as const;
export const SOURCE_CATEGORIES = ["CENTRAL", "BANKING", "RAILWAY", "STATE", "DEFENCE", "EDUCATION", "OTHER_GOVT", "AGGREGATOR"] as const;

export const SOURCE_CATEGORY_LABEL: Record<(typeof SOURCE_CATEGORIES)[number], string> = {
  CENTRAL: "A. Central government",
  BANKING: "B. Banking & financial",
  RAILWAY: "C. Railway",
  STATE: "D. State / UT government",
  DEFENCE: "E. Defence & uniformed",
  EDUCATION: "F. Education & entrance",
  OTHER_GOVT: "G. Other government",
  AGGREGATOR: "Public aggregator (discovery only)",
};

/** Default re-check interval per priority (minutes): high every 30 min,
 * normal every 4 h, low once a day. Overridable per source and through
 * PIPELINE_FREQ_HIGH / _NORMAL / _LOW (minutes). */
function envMinutes(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 5 ? Math.floor(n) : fallback;
}
export const DEFAULT_FREQUENCY_MINUTES: Record<(typeof SOURCE_PRIORITIES)[number], number> = {
  HIGH: envMinutes("PIPELINE_FREQ_HIGH", 30),
  NORMAL: envMinutes("PIPELINE_FREQ_NORMAL", 240),
  LOW: envMinutes("PIPELINE_FREQ_LOW", 1440),
};

const optionalUrl = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

const checkbox = z.preprocess(
  (val) => val === "on" || val === "true" || val === true,
  z.boolean(),
);

/** JSON text from a textarea → validated object (or null when blank). */
function jsonField<T extends z.ZodType>(schema: T, label: string) {
  return z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== "string") return val;
    if (!val.trim()) return null;
    try {
      return JSON.parse(val);
    } catch {
      return { __invalidJson: true };
    }
  }, z.union([z.null(), schema], { error: `${label} must be valid JSON using the documented fields` }));
}

export const sourceInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  organizationId: optionalTrimmedString,
  listingUrl: z.url("Listing URL must be a valid http(s) URL").refine((u) => /^https?:\/\//i.test(u), "Listing URL must start with http:// or https://"),
  /** Derived from listingUrl when left blank. */
  officialDomain: optionalTrimmedString,
  sourceType: z.enum(SOURCE_TYPES),
  category: z.enum(SOURCE_CATEGORIES).default("CENTRAL"),
  stateCode: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined),
    z.string().refine(isRegionCode, "Unknown state/UT code").optional(),
  ),
  groupName: optionalTrimmedString,
  rssUrl: optionalUrl,
  apiUrl: optionalUrl,
  parserType: optionalTrimmedString,
  parserConfig: jsonField(parserConfigSchema, "Parser configuration").optional(),
  paginationConfig: jsonField(paginationConfigSchema, "Pagination configuration").optional(),
  priority: z.enum(SOURCE_PRIORITIES),
  checkFrequencyMinutes: z.coerce.number().int().min(5).max(10080),
  requestTimeoutMs: z.coerce.number().int().min(2000).max(120000).default(20000),
  minRequestIntervalMs: z.coerce.number().int().min(0).max(60000).default(1500),
  isAggregator: checkbox.default(false),
  active: checkbox,
});

export type SourceInput = z.infer<typeof sourceInputSchema>;
