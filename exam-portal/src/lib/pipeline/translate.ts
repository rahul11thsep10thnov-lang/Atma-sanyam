import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isClaudeConfigured, DEFAULT_MODEL } from "./extract/claude";
import { recordAuditLog, PIPELINE_ACTOR } from "@/lib/services/auditLog";

/**
 * Hindi translation (spec §22): produced by Claude only when a key is
 * configured, stored next to the English text and always marked
 * `translationSource = "claude"` so the site can label it as a machine
 * translation. A human edit in the admin flips it to "admin". Without a
 * key nothing is invented — the Hindi fields simply stay empty.
 */
export const translationSchema = z.object({
  title_hi: z.string(),
  summary_hi: z.string().nullable(),
});
export type Translation = z.infer<typeof translationSchema>;
export type TranslateFn = (input: { title: string; summary: string | null; context: string | null }) => Promise<Translation | null>;

const SYSTEM = `You translate Indian government recruitment notice titles and summaries from English into natural, formal Hindi (Devanagari) as used by Indian government portals. Keep organization names, exam names, abbreviations (SSC, UPSC, CGL), numbers, dates and post names exactly as they are (transliterate only common words). Do not add information. Return title_hi and summary_hi (null if there is no summary).`;

export function isTranslationEnabled(): boolean {
  // Off by default now that the public site is English-only.
  return isClaudeConfigured() && process.env.AI_TRANSLATION_ENABLED === "true";
}

export async function createSdkTranslateFn(): Promise<TranslateFn> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic();
  const model = process.env.AI_TRANSLATION_MODEL || process.env.AI_EXTRACTION_MODEL || DEFAULT_MODEL;
  return async (input) => {
    const response = await client.messages.parse({
      model,
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: zodOutputFormat(translationSchema) },
      messages: [{ role: "user", content: `${input.context ? `Context: ${input.context}\n` : ""}Title: ${input.title}\nSummary: ${input.summary ?? "(none)"}` }],
    });
    if (response.stop_reason === "refusal") return null;
    return (response.parsed_output as Translation | null) ?? null;
  };
}

/** Translate one notice (and its recruitment's title if still English-only). */
export async function translateNotice(noticeId: string, options: { translate?: TranslateFn; force?: boolean; adminId?: string | null } = {}): Promise<{ translated: boolean; recruitmentTranslated: boolean }> {
  const notice = await prisma.recruitmentNotice.findUnique({
    where: { id: noticeId },
    select: { id: true, title: true, summary: true, titleHi: true, translationSource: true, organization: { select: { name: true } }, recruitment: { select: { id: true, title: true, summary: true, titleHi: true, translationSource: true } } },
  });
  if (!notice) return { translated: false, recruitmentTranslated: false };
  const translate = options.translate ?? (isTranslationEnabled() ? await createSdkTranslateFn() : null);
  if (!translate) return { translated: false, recruitmentTranslated: false };
  const actor = options.adminId ? { adminUserId: options.adminId } : { actor: PIPELINE_ACTOR };

  let translated = false;
  if (options.force || !notice.titleHi || notice.translationSource === "claude") {
    if (notice.translationSource !== "admin" || options.force) {
      const t = await translate({ title: notice.title, summary: notice.summary, context: notice.organization?.name ?? null });
      if (t && t.title_hi.trim()) {
        await prisma.recruitmentNotice.update({ where: { id: notice.id }, data: { titleHi: t.title_hi.trim(), summaryHi: t.summary_hi?.trim() || null, translationSource: "claude" } });
        await recordAuditLog({ ...actor, action: "UPDATE", contentType: "RecruitmentNotice", contentId: notice.id, newValue: { translated: "hi", source: "claude" } });
        translated = true;
      }
    }
  }
  let recruitmentTranslated = false;
  const r = notice.recruitment;
  if (r && (options.force || !r.titleHi) && r.translationSource !== "admin") {
    const t = await translate({ title: r.title, summary: r.summary, context: notice.organization?.name ?? null });
    if (t && t.title_hi.trim()) {
      await prisma.recruitment.update({ where: { id: r.id }, data: { titleHi: t.title_hi.trim(), summaryHi: t.summary_hi?.trim() || null, translationSource: "claude" } });
      await recordAuditLog({ ...actor, action: "UPDATE", contentType: "Recruitment", contentId: r.id, newValue: { translated: "hi", source: "claude" } });
      recruitmentTranslated = true;
    }
  }
  return { translated, recruitmentTranslated };
}
