import { z } from "zod";

/**
 * Per-source parser configuration (Source.parserConfig). Every site lays
 * out its notice board differently, so instead of one global selector each
 * source can say where its items are. All fields are optional; an empty
 * config is the generic "PDF links + recruitment keywords" scan.
 */
export const parserConfigSchema = z
  .object({
    /** HTML: CSS selector for one notice row/card (e.g. "table.notices tr"). */
    itemSelector: z.string().max(300).optional(),
    /** HTML: link inside the item (default: first a[href]). */
    linkSelector: z.string().max(300).optional(),
    /** HTML: element holding the title (default: link text). */
    titleSelector: z.string().max(300).optional(),
    /** HTML: element holding the date (default: any date in the row). */
    dateSelector: z.string().max(300).optional(),
    /** Keep only URLs matching this regex. */
    includeUrlPattern: z.string().max(300).optional(),
    /** Drop URLs matching this regex (e.g. "/(tender|rti)/"). */
    excludeUrlPattern: z.string().max(300).optional(),
    /** When false, every link in the configured region counts, not only
     * PDFs and links with recruitment keywords. Default true. */
    keywordFilter: z.boolean().optional(),
    /** Keep only links on the source's own site (aggregators: true). */
    sameSiteOnly: z.boolean().optional(),
    /** JSON: dotted path to the array of items ("data.notices"). */
    itemsPath: z.string().max(200).optional(),
    /** JSON: field names inside one item. */
    urlField: z.string().max(100).optional(),
    titleField: z.string().max(100).optional(),
    dateField: z.string().max(100).optional(),
    /** Upper bound on candidates taken from one page. */
    maxItems: z.number().int().min(1).max(1000).optional(),
  })
  .strict();

export type ParserConfig = z.infer<typeof parserConfigSchema>;

/**
 * Pagination (Source.paginationConfig). Either follow a "next" link found
 * by selector / rel="next", or fill a page number into a URL template.
 * Pages are always fetched from the same site and capped by maxPages.
 */
export const paginationConfigSchema = z
  .object({
    type: z.enum(["nextLink", "pattern"]),
    /** nextLink: selector for the next-page anchor (default: a[rel=next], or a link whose text is "Next"/"»"/"View More"). */
    nextSelector: z.string().max(300).optional(),
    /** pattern: URL with {page}, e.g. "https://x.gov.in/notices?page={page}". */
    urlTemplate: z.string().max(500).optional(),
    startPage: z.number().int().min(0).max(1000).optional(),
    /** Total pages including the first. Hard ceiling 10. */
    maxPages: z.number().int().min(1).max(10).default(3),
  })
  .strict();

export type PaginationConfig = z.infer<typeof paginationConfigSchema>;

/** Parses stored JSON leniently: invalid config is reported, not thrown,
 * so one bad source can't break a run. */
export function readParserConfig(raw: unknown): { config: ParserConfig; error: string | null } {
  if (raw === null || raw === undefined || raw === "") return { config: {}, error: null };
  const parsed = parserConfigSchema.safeParse(raw);
  if (!parsed.success) return { config: {}, error: `Invalid parser configuration: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  for (const key of ["includeUrlPattern", "excludeUrlPattern"] as const) {
    const re = parsed.data[key];
    if (re) {
      try {
        new RegExp(re);
      } catch {
        return { config: {}, error: `Invalid parser configuration: ${key} is not a valid regular expression` };
      }
    }
  }
  return { config: parsed.data, error: null };
}

export function readPaginationConfig(raw: unknown): { config: PaginationConfig | null; error: string | null } {
  if (raw === null || raw === undefined || raw === "") return { config: null, error: null };
  const parsed = paginationConfigSchema.safeParse(raw);
  if (!parsed.success) return { config: null, error: `Invalid pagination configuration: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  if (parsed.data.type === "pattern" && !parsed.data.urlTemplate?.includes("{page}")) {
    return { config: null, error: "Invalid pagination configuration: pattern pagination needs a urlTemplate containing {page}" };
  }
  return { config: parsed.data, error: null };
}
