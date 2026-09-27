// Seeds the category tree (idempotent). With --with-samples it also adds a few
// PLACEHOLDER images as *drafts* (picsum.photos test images — not licensed
// content). Drafts never reach the app until an admin publishes them; replace
// them with properly licensed images before going live.
import { createDatabase } from './client.js';
import { categories, content } from './schema.js';

const CATEGORY_TREE: { id: string; name: string; parentId: string | null }[] = [
  { id: 'religion', name: 'Religion', parentId: null },
  { id: 'religion-shiva', name: 'Shiva', parentId: 'religion' },
  { id: 'religion-shiva-mahadev', name: 'Mahadev', parentId: 'religion-shiva' },
  { id: 'nature', name: 'Nature', parentId: null },
  { id: 'nature-mountains', name: 'Mountains', parentId: 'nature' },
  { id: 'nature-mountains-himalayas', name: 'Himalayas', parentId: 'nature-mountains' },
  { id: 'movies', name: 'Movies', parentId: null },
  { id: 'movies-bollywood', name: 'Bollywood', parentId: 'movies' },
  { id: 'series', name: 'Series', parentId: null },
  { id: 'series-netflix', name: 'Netflix', parentId: 'series' },
  { id: 'anime', name: 'Anime', parentId: null },
  { id: 'anime-naruto', name: 'Naruto', parentId: 'anime' },
];

const picsum = (seed: string, size: number) => `https://picsum.photos/seed/${seed}/${size}/${size}`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const database = createDatabase(url, 1);
  try {
    // Parents first so the self-referencing foreign key is satisfied.
    for (const [i, c] of CATEGORY_TREE.entries()) {
      await database.db.insert(categories).values({ ...c, sortOrder: i }).onConflictDoNothing();
    }
    console.log(`Categories ensured (${CATEGORY_TREE.length}).`);

    if (process.argv.includes('--with-samples')) {
      const samples = [
        ['himalaya-1', 'Snow ridge line', 'nature', 'nature-mountains-himalayas', ['himalayas', 'snow']],
        ['himalaya-2', 'Prayer flags at altitude', 'nature', 'nature-mountains-himalayas', ['himalayas', 'flags']],
        ['mahadev-1', 'Mahadev at dawn', 'religion', 'religion-shiva-mahadev', ['shiva', 'sunrise']],
        ['naruto-1', 'Leaf village gate', 'anime', 'anime-naruto', ['naruto', 'konoha']],
      ] as const;
      for (const [seed, title, cat, sub, tags] of samples) {
        await database.db.insert(content).values({
          title,
          categoryId: cat,
          subcategoryId: sub,
          tags: [...tags],
          thumbnailUrl: picsum(seed, 160),
          mediumUrl: picsum(seed, 640),
          fullUrl: picsum(seed, 1080),
          source: 'picsum.photos (placeholder)',
          creator: 'Unknown (placeholder)',
          license: 'placeholder — replace before publishing',
          status: 'draft',
        });
      }
      console.log(`Added ${samples.length} placeholder DRAFT images.`);
    }
  } finally {
    await database.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
