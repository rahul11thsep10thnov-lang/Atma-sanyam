import { z } from "zod";
import { optionalDate, optionalTrimmedString } from "@/lib/validation/shared";

const urlField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

export const answerKeyInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optionalTrimmedString,
  examId: z.string().min(1, "Exam is required"),
  answerKeyDate: optionalDate,
  answerKeyUrl: urlField,
  objectionDeadline: optionalDate,
  objectionInfo: optionalTrimmedString,
});

export type AnswerKeyInput = z.infer<typeof answerKeyInputSchema>;
