import { and, arrayContains, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { categories, content } from '../database/schema.js';
import { escapeLike } from '../lib/strings.js';

export type ContentRow = typeof content.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;

// Shape consumed by the mobile app (src/content/types.ts `ContentImage`).
export function toPublicImage(row: ContentRow) {
  return {
    imageId: row.id,
    title: row.title,
    category: row.categoryId ?? '',
    subcategory: row.subcategoryId,
    tags: row.tags,
    thumbnailUrl: row.thumbnailUrl,
    mediumImageUrl: row.mediumUrl,
    fullImageUrl: row.fullUrl,
    source: row.source,
    creator: row.creator,
    license: row.license,
    attributionRequired: row.attributionRequired,
    attributionText: row.attributionText,
    createdAt: (row.publishedAt ?? row.createdAt).toISOString(),
    popularity: row.popularity,
  };
}

export async function descendantCategoryIds(db: Db, rootId: string): Promise<string[]> {
  const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
  const children = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id]);
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of children.get(id) ?? []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return [...out];
}

// Would a category become its own ancestor? (prevents cycles on re-parenting)
export async function wouldCreateCycle(db: Db, id: string, newParentId: string): Promise<boolean> {
  const descendants = await descendantCategoryIds(db, id);
  return descendants.includes(newParentId);
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString('base64url');
}

export function decodeCursor(cursor: string | undefined | null): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { o?: unknown };
    const o = Number(parsed.o);
    return Number.isInteger(o) && o >= 0 && o <= 100_000 ? o : 0;
  } catch {
    return 0;
  }
}

interface ContentFilter {
  status?: 'draft' | 'published';
  categoryId?: string;
  search?: string;
  tags?: string[];
}

async function buildWhere(db: Db, f: ContentFilter): Promise<SQL | undefined> {
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(content.status, f.status));
  if (f.categoryId) {
    const ids = await descendantCategoryIds(db, f.categoryId);
    conds.push(or(inArray(content.categoryId, ids), inArray(content.subcategoryId, ids))!);
  }
  if (f.tags && f.tags.length > 0) {
    conds.push(arrayContains(content.tags, f.tags));
  }
  if (f.search) {
    const needle = `%${escapeLike(f.search)}%`;
    conds.push(
      or(
        ilike(content.title, needle),
        sql`array_to_string(${content.tags}, ' ') ILIKE ${needle}`,
        ilike(content.categoryId, needle),
        ilike(content.subcategoryId, needle)
      )!
    );
  }
  return conds.length ? and(...conds) : undefined;
}

export async function listPublishedContent(
  db: Db,
  q: { search?: string; categoryId?: string; tags?: string[]; sort: 'newest' | 'popular' | 'title'; limit: number; cursor?: string }
) {
  const offset = decodeCursor(q.cursor);
  const where = await buildWhere(db, { status: 'published', categoryId: q.categoryId, search: q.search, tags: q.tags });
  const orderBy =
    q.sort === 'popular'
      ? [desc(content.popularity), desc(content.id)]
      : q.sort === 'title'
        ? [asc(content.title), asc(content.id)]
        : [desc(content.publishedAt), desc(content.id)];
  // Fetch one extra row to know whether another page exists.
  const rows = await db
    .select()
    .from(content)
    .where(where)
    .orderBy(...orderBy)
    .limit(q.limit + 1)
    .offset(offset);
  const hasMore = rows.length > q.limit;
  return {
    items: rows.slice(0, q.limit).map(toPublicImage),
    nextCursor: hasMore ? encodeCursor(offset + q.limit) : null,
  };
}

export async function listContentForAdmin(
  db: Db,
  q: { search?: string; categoryId?: string; status?: 'draft' | 'published'; page: number; pageSize: number }
) {
  const where = await buildWhere(db, q);
  const [totalRow] = await db.select({ n: count() }).from(content).where(where);
  const items = await db
    .select()
    .from(content)
    .where(where)
    .orderBy(desc(content.updatedAt), desc(content.id))
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);
  return { items, total: totalRow?.n ?? 0, page: q.page, pageSize: q.pageSize };
}
