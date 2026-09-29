import { z } from "zod";
import { optionalDate, optionalTrimmedString } from "@/lib/validation/shared";

const urlField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

export const scholarshipInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optionalTrimmedString,
  organizationId: optionalTrimmedString,
  stateId: optionalTrimmedString,
  applicationEndDate: optionalDate,
  eligibility: optionalTrimmedString,
  amount: optionalTrimmedString,
  officialWebsite: urlField,
});

export type ScholarshipInput = z.infer<typeof scholarshipInputSchema>;
