import "@/lib/cms/server-guard";
import { getDb, destinationBySlug } from "@/lib/master/repo";
import { cmsFromSeed } from "../../bootstrap";
import type { CmsDestination } from "../../types";

/**
 * The project's own master seed database as a research source. Its records
 * are editorial drafts with their own source ids; the pipeline uses them
 * when a destination from a PDF matches a seed destination by slug/name.
 */
export function seedLookup(slug: string, name: string): CmsDestination | null {
  const db = getDb();
  const d = destinationBySlug(slug) ?? db.destinations.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return d ? cmsFromSeed(db, d, new Date().toISOString()) : null;
}
