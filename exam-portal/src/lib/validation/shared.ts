import { z } from "zod";

/** An HTML form always sends strings; empty fields arrive as `""`, not
 * `undefined`. These helpers turn that into schemas that behave like the
 * optional field they represent. */

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

export const optionalTrimmedString = z.preprocess(
  emptyToUndefined,
  z.string().trim().optional(),
);

export const optionalDate = z.preprocess(
  emptyToUndefined,
  z.coerce.date().optional(),
);

export const optionalInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().optional(),
);

export const optionalDecimal = z.preprocess(
  emptyToUndefined,
  z.coerce.number().nonnegative().optional(),
);

/** A newline- or comma-separated textarea value into a clean string[]. */
export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
