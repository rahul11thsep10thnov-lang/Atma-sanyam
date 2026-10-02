import { z } from "zod";
import { NOTICE_TYPES } from "@/lib/pipeline/extract/schema";

const optionalId = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(1).max(64).optional());

export const alertSubscribeSchema = z.object({
  email: z.email().max(254).transform((e) => e.trim().toLowerCase()),
  recruitmentId: optionalId,
  organizationId: optionalId,
  categoryId: optionalId,
  stateId: optionalId,
  keyword: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().min(2).max(80).optional()),
  noticeTypes: z.array(z.enum(NOTICE_TYPES)).max(NOTICE_TYPES.length).default([]),
  minPriority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).default("LOW"),
  locale: z.enum(["en", "hi"]).default("en"),
});
export type AlertSubscribeInput = z.infer<typeof alertSubscribeSchema>;
