import type { z } from 'zod';
import { badRequest } from '../lib/httpError.js';

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
