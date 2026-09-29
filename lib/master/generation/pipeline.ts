import type { ContentStatus } from "../enums";
import type { GeneratedContent, MasterDatabase, SeoMetadata } from "../types";
import { buildGenerationInput } from "./input";
import { buildSeo } from "./seo";
import { TemplateWriter } from "./templateWriter";
import type { ContentWriter, GeneratedPage, GenerationInput } from "./types";
import { factCheck, validateSeo, type FactCheckResult, type SeoIssue } from "./validator";

export interface DestinationContent {
  input: GenerationInput;
  page: GeneratedPage;
  seo: SeoMetadata;
  fact_check: FactCheckResult;
  seo_issues: SeoIssue[];
  record: GeneratedContent;
}

const PROMPT_VERSION = "structured-input-v1";

/** Publication gate: with REQUIRE_EDITOR_APPROVAL=true only editor-approved (PUBLISHED) content is served. */
export function isServable(status: ContentStatus): boolean {
  return process.env.REQUIRE_EDITOR_APPROVAL === "true" ? status === "PUBLISHED" : status === "FACT_CHECKED" || status === "PUBLISHED";
}

const plainText = (page: GeneratedPage) =>
  page.sections
    .flatMap((s) => [...s.paragraphs.map((p) => p.text), ...s.bullets.map((b) => (typeof b === "string" ? b : b.text))])
    .join(" ");

/** GENERATE → FACT-CHECK → SEO VALIDATION → (admin approval) → PUBLISH, for one destination. */
export function assembleContent(input: GenerationInput, page: GeneratedPage, writer: ContentWriter, modelLabel = writer.name): DestinationContent {
  const seo = buildSeo(input, page);
  const check = factCheck(page, input);
  const seoIssues = validateSeo(seo, input.destination.name, plainText(page));

  const blocking = seoIssues.filter((i) => i.severity === "ERROR");
  const passed = check.status === "PASSED" && blocking.length === 0;
  const record: GeneratedContent = {
    id: `GC-${input.destination.id}-en-1`,
    entity_id: input.destination.id,
    page_type: "DESTINATION_PAGE",
    content_type: "destination-guide",
    language: "en",
    title: page.title,
    subtitle: page.subtitle,
    content: JSON.stringify({ sections: page.sections, faq: page.faq }),
    ai_model: modelLabel,
    prompt_version: PROMPT_VERSION,
    source_data_version: input.data_version,
    generation_timestamp: "2026-09-28T00:00:00.000Z",
    fact_check_status: check.status === "PASSED" ? (blocking.length ? "NEEDS_REVIEW" : "PASSED") : "FAILED",
    editor_status: "PENDING",
    published_status: passed ? "FACT_CHECKED" : "AI_GENERATED",
    content_version: 1
  };
  return { input, page, seo, fact_check: check, seo_issues: seoIssues, record };
}

export function generateDestinationContent(db: MasterDatabase, destinationId: string, writer: ContentWriter = new TemplateWriter()): DestinationContent {
  const input = buildGenerationInput(db, destinationId);
  const page = writer.write(input);
  if (page instanceof Promise) throw new Error("generateDestinationContent needs a synchronous writer; use generateDestinationContentAsync");
  return assembleContent(input, page, writer);
}

export async function generateDestinationContentAsync(db: MasterDatabase, destinationId: string, writer: ContentWriter): Promise<DestinationContent> {
  const input = buildGenerationInput(db, destinationId);
  const page = await writer.write(input);
  return assembleContent(input, page, writer);
}

export interface AllContent {
  generated_content: GeneratedContent[];
  seo_metadata: SeoMetadata[];
  reports: Array<{ destination_id: string; fact_check: FactCheckResult; seo_issues: SeoIssue[] }>;
}

export function generateAllContent(db: MasterDatabase): AllContent {
  const out: AllContent = { generated_content: [], seo_metadata: [], reports: [] };
  for (const d of db.destinations) {
    const c = generateDestinationContent(db, d.id);
    out.generated_content.push(c.record);
    out.seo_metadata.push(c.seo);
    out.reports.push({ destination_id: d.id, fact_check: c.fact_check, seo_issues: c.seo_issues });
  }
  return out;
}

// ---- in-memory store used by the pages (server-side; regenerates when a destination's data version changes)
const store = new Map<string, DestinationContent>();

export function getDestinationContent(db: MasterDatabase, destinationId: string): DestinationContent {
  const cached = store.get(destinationId);
  if (cached) return cached;
  const fresh = generateDestinationContent(db, destinationId);
  store.set(destinationId, fresh);
  return fresh;
}

export function clearContentStore(): void {
  store.clear();
}
