import { z } from "zod";
import { optionalTrimmedString, parseList } from "@/lib/validation/shared";

export const syllabusInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optionalTrimmedString,
  examId: z.string().min(1, "Exam is required"),
});

export type SyllabusInput = z.infer<typeof syllabusInputSchema>;

/** Structural nodes (Paper/Subject/Topic) are simpler — just a name, plus
 * a topic's subtopics list. No status/workflow of their own; they live
 * or die with the parent Syllabus. */
export const paperNameSchema = z.string().trim().min(1).max(200);
export const subjectNameSchema = z.string().trim().min(1).max(200);
export const topicInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subtopics: z.string().optional(),
});

export { parseList };
