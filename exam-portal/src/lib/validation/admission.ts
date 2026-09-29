import { z } from "zod";
import { optionalDate, optionalTrimmedString } from "@/lib/validation/shared";

const urlField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

export const admissionInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optionalTrimmedString,
  organizationId: optionalTrimmedString,
  categoryId: optionalTrimmedString,
  stateId: optionalTrimmedString,
  applicationStartDate: optionalDate,
  applicationEndDate: optionalDate,
  eligibility: optionalTrimmedString,
  officialWebsite: urlField,
});

export type AdmissionInput = z.infer<typeof admissionInputSchema>;
