import { z } from "zod";
import { optionalDate, optionalTrimmedString } from "@/lib/validation/shared";

const urlField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

export const admitCardInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optionalTrimmedString,
  examId: z.string().min(1, "Exam is required"),
  releaseDate: optionalDate,
  examDate: optionalDate,
  downloadUrl: urlField,
  officialWebsite: urlField,
  instructions: optionalTrimmedString,
});

export type AdmitCardInput = z.infer<typeof admitCardInputSchema>;
