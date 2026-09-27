import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import type { Db } from './client.js';
import { chapters, exams, subjects } from './schema.js';

interface TaxonomyFile {
  exams: {
    slug: string;
    name: string;
    stateCode?: string;
    examType?: string;
    defaultLanguage?: string;
    subjects: { slug: string; name: string; sortOrder: number; chapters: { slug: string; name: string; sortOrder: number }[] }[];
  }[];
}

const here = path.dirname(fileURLToPath(import.meta.url));
export const SEED_DIR = path.resolve(here, '../../seed');

export function loadTaxonomy(): TaxonomyFile {
  return JSON.parse(readFileSync(path.join(SEED_DIR, 'taxonomy.json'), 'utf8')) as TaxonomyFile;
}

/** Idempotent: inserts missing exams/subjects/chapters, never renames or
 * deletes what an admin has already changed. */
export async function seedTaxonomy(db: Db, data: TaxonomyFile = loadTaxonomy()) {
  let created = 0;
  for (const e of data.exams) {
    let [exam] = await db.select().from(exams).where(eq(exams.slug, e.slug)).limit(1);
    if (!exam) {
      [exam] = await db
        .insert(exams)
        .values({
          slug: e.slug,
          name: e.name,
          stateCode: e.stateCode ?? null,
          examType: e.examType ?? null,
          defaultLanguage: e.defaultLanguage ?? 'hi-Latn',
        })
        .returning();
      created++;
    }
    for (const s of e.subjects) {
      let [subject] = await db
        .select()
        .from(subjects)
        .where(and(eq(subjects.examId, exam!.id), eq(subjects.slug, s.slug)))
        .limit(1);
      if (!subject) {
        [subject] = await db
          .insert(subjects)
          .values({ examId: exam!.id, slug: s.slug, name: s.name, sortOrder: s.sortOrder })
          .returning();
        created++;
      }
      for (const c of s.chapters) {
        const [chapter] = await db
          .select({ id: chapters.id })
          .from(chapters)
          .where(and(eq(chapters.subjectId, subject!.id), eq(chapters.slug, c.slug)))
          .limit(1);
        if (!chapter) {
          await db.insert(chapters).values({ subjectId: subject!.id, slug: c.slug, name: c.name, sortOrder: c.sortOrder });
          created++;
        }
      }
    }
  }
  return { created };
}
