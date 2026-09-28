import { z } from "zod";
import {
  optionalDate,
  optionalDecimal,
  optionalInt,
  optionalTrimmedString,
} from "@/lib/validation/shared";

const urlField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

export const jobInputSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: optionalTrimmedString,
    examId: z.string().min(1, "Exam is required"),
    advertisementNumber: optionalTrimmedString,
    vacancies: optionalInt,
    qualification: optionalTrimmedString,
    ageLimitMin: optionalInt,
    ageLimitMax: optionalInt,
    applicationFee: optionalDecimal,
    officialWebsite: urlField,
    applyUrl: urlField,
    eligibility: optionalTrimmedString,
    /** Newline-separated in the form, e.g. "Tier 1\nTier 2\nInterview". */
    selectionProcess: optionalTrimmedString,
    salary: optionalTrimmedString,
    applicationEndDate: optionalDate,
    seoTitle: optionalTrimmedString,
    seoDescription: optionalTrimmedString,
    /** Comma-separated. */
    seoKeywords: optionalTrimmedString,
  })
  .refine(
    (data) =>
      data.ageLimitMin === undefined ||
      data.ageLimitMax === undefined ||
      data.ageLimitMin <= data.ageLimitMax,
    { message: "Minimum age must be less than maximum age", path: ["ageLimitMax"] },
  );

export type JobInput = z.infer<typeof jobInputSchema>;
