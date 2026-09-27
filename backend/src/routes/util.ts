import type { Request } from 'express';
import { z } from 'zod';
import { notFound } from '../lib/httpError.js';

const uuid = z.uuid();

/** Route :id params must be UUIDs; anything else is a 404, not a DB error. */
export function idParam(req: Request, name = 'id'): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !uuid.safeParse(value).success) throw notFound();
  return value;
}

export const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined))
  .pipe(z.uuid().optional());

export const pageQuery = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
};
