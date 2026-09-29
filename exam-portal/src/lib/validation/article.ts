import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validation/shared";

export const articleInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optionalTrimmedString,
  body: z.string().trim().min(1, "Body is required"),
  coverImageUrl: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.url().optional(),
  ),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;
