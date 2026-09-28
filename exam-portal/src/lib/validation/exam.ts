import { z } from "zod";
import { optionalDate, optionalTrimmedString } from "@/lib/validation/shared";

export const examInputSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: optionalTrimmedString,
    organizationId: z.string().min(1, "Organization is required"),
    categoryId: z.string().min(1, "Category is required"),
    stateId: optionalTrimmedString,
    examDate: optionalDate,
    applicationStartDate: optionalDate,
    applicationEndDate: optionalDate,
  })
  .refine(
    (data) =>
      !data.applicationStartDate ||
      !data.applicationEndDate ||
      data.applicationStartDate <= data.applicationEndDate,
    {
      message: "Application start date must be before the end date",
      path: ["applicationEndDate"],
    },
  );

export type ExamInput = z.infer<typeof examInputSchema>;
