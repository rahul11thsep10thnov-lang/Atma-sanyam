import type { z } from 'zod';
import { badRequest } from '../lib/httpError.js';

/**
 * Validates a PATCH body against `schema.partial()` and keeps only the keys
 * the client actually sent. zod's partial() still fills in field defaults for
 * omitted keys, which would silently reset every defaulted column on a
 * one-field edit.
 */
export function parsePatch<T extends z.ZodObject>(schema: T, input: unknown): Partial<z.infer<T>> {
  const parsed = parse(schema.partial(), input) as Record<string, unknown>;
  const sent = input && typeof input === 'object' ? new Set(Object.keys(input as Record<string, unknown>)) : new Set<string>();
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => sent.has(k))) as Partial<z.infer<T>>;
}

export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw badRequest(
      'Invalid request',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  }
  return result.data;
}
