import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validation/shared";

export const SOURCE_TYPES = ["HTML", "PDF", "RSS", "API", "SITEMAP", "JSON", "XML"] as const;
export const SOURCE_PRIORITIES = ["HIGH", "NORMAL", "LOW"] as const;

/** Default re-check interval per priority (minutes), per the spec:
 * ~30 min for high, 1–6 h for normal, 12–24 h for low. */
export const DEFAULT_FREQUENCY_MINUTES: Record<(typeof SOURCE_PRIORITIES)[number], number> = {
  HIGH: 30,
  NORMAL: 360,
  LOW: 1440,
};

const optionalUrl = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

const checkbox = z.preprocess(
  (val) => val === "on" || val === "true" || val === true,
  z.boolean(),
);

export const sourceInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  organizationId: optionalTrimmedString,
  listingUrl: z.url("Listing URL must be a valid http(s) URL"),
  /** Derived from listingUrl when left blank. */
  officialDomain: optionalTrimmedString,
  sourceType: z.enum(SOURCE_TYPES),
  rssUrl: optionalUrl,
  apiUrl: optionalUrl,
  parserType: optionalTrimmedString,
  priority: z.enum(SOURCE_PRIORITIES),
  checkFrequencyMinutes: z.coerce.number().int().min(5).max(10080),
  active: checkbox,
});

export type SourceInput = z.infer<typeof sourceInputSchema>;
