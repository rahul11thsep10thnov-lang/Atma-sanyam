// Seeds DADU's canonical content: the seven characters, every location, the
// nine ported sample lessons and their real-world assignments, all published.
// Idempotent: re-running updates the bodies and keeps versions at 1.
// Usage: DATABASE_URL=... npm run seed:dadu
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createDatabase, type Db } from './client.js';
import { daduContentItems, daduContentVersions } from './schema.js';
import { bodyForKind, type ContentKind } from '../dadu/contracts.js';
import { SEED_ASSIGNMENTS, SEED_LESSONS } from './daduSeedContent.generated.js';

// Mirrors src/dadu/core/characters.ts and locations.ts in the mobile app.
const CHARACTERS = [
  { key: 'dadaji', legacyKeys: [], kind: 'human', heightWu: 10.5, name: { en: 'Dadaji', hi: 'दादाजी' }, role: { en: 'The one and only teacher. Introduces, explains, asks, encourages, corrects and tells stories.', hi: 'एकमात्र शिक्षक।' }, voice: { en: 'Warm, slow, expressive, slightly husky; chuckles.', hi: 'गर्मजोशी भरी, धीमी आवाज़।' }, joins: [] },
  { key: 'chintu', legacyKeys: ['gopu'], kind: 'human', heightWu: 6, name: { en: 'Chintu', hi: 'चिंटू' }, role: { en: 'The naughty, curious grandchild.', hi: 'शरारती, जिज्ञासु बच्चा।' }, voice: { en: 'Young, bright, fast, giggly.', hi: 'छोटी, चमकीली आवाज़।' }, joins: [] },
  { key: 'buddy', legacyKeys: ['kim'], kind: 'dog', heightWu: 4, name: { en: 'Buddy', hi: 'बडी' }, role: { en: 'Playful golden dog. Sports, reasoning.', hi: 'खिलंदड़ सुनहरा कुत्ता।' }, voice: { en: 'Playful, bouncy, short barks.', hi: 'चंचल आवाज़।' }, joins: ['sports', 'stem', 'nature', 'mind'] },
  { key: 'chikki', legacyKeys: ['molly'], kind: 'rabbit', heightWu: 3, name: { en: 'Chikki', hi: 'चिक्की' }, role: { en: 'White rabbit, curious and a little shy. Maths, puzzles, logic.', hi: 'सफ़ेद खरगोश। गणित, पहेलियाँ।' }, voice: { en: 'Soft, quick, precise.', hi: 'मुलायम, तेज़।' }, joins: ['academic', 'mind', 'art', 'stem'] },
  { key: 'gauri', legacyKeys: [], kind: 'cow', heightWu: 8, name: { en: 'Gauri', hi: 'गौरी' }, role: { en: 'Gentle protective cow. Agriculture, nature, animals, nutrition.', hi: 'कोमल गाय।' }, voice: { en: 'Calm, deep, slow.', hi: 'शांत, गहरी।' }, joins: ['nature', 'academic', 'explore'] },
  { key: 'nandu', legacyKeys: ['dhanu'], kind: 'calf', heightWu: 4.5, name: { en: 'Nandu', hi: 'नंदू' }, role: { en: 'Small brown-and-white calf who follows Gauri.', hi: 'छोटा बछड़ा।' }, voice: { en: 'Innocent, squeaky.', hi: 'मासूम।' }, joins: ['nature', 'music', 'explore'] },
  { key: 'mitthu', legacyKeys: [], kind: 'parrot', heightWu: 2, name: { en: 'Mitthu', hi: 'मिट्ठू' }, role: { en: "Mountain parrot. Revision only (Mitthu's Echo).", hi: 'पहाड़ी तोता। केवल दोहराव।' }, voice: { en: 'Chirpy, rhythmic.', hi: 'चहकती।' }, joins: ['music'] },
];

const villa = (id: string, en: string, hi: string, w: number, d: number, idlers: string[], ambience = 'villa.inside') => ({ id: `villa.${id}`, world: 'home', name: { en, hi }, size: { w, d }, entry: { x: Math.floor(w / 2), y: d - 1 }, parent: 'villa.exterior', camera: 'iso', idlers, ambience });
const loc = (id: string, world: string, en: string, hi: string, w: number, d: number, idlers: string[], ambience: string, camera = 'iso') => ({ id, world, name: { en, hi }, size: { w, d }, entry: { x: Math.floor(w / 2), y: d - 1 }, camera, idlers, ambience });
const LOCATIONS = [
  loc('map', 'home', 'The Miniverse', 'मिनीवर्स', 24, 16, [], 'town'),
  loc('villa.exterior', 'home', "Dadaji's villa", 'दादाजी का विला', 16, 12, ['buddy'], 'garden.day'),
  villa('veranda', 'Entrance veranda', 'प्रवेश बरामदा', 8, 4, ['mitthu'], 'garden.day'),
  villa('living', 'Living room', 'बैठक', 10, 8, ['dadaji', 'chintu', 'chikki']),
  villa('kitchen', 'Kitchen', 'रसोई', 8, 6, ['dadaji']),
  villa('dining', 'Dining room', 'भोजन कक्ष', 7, 6, ['chintu']),
  villa('bedroom_dadaji', "Dadaji's bedroom", 'दादाजी का कमरा', 7, 6, ['dadaji']),
  villa('bedroom_chintu', "Chintu's bedroom", 'चिंटू का कमरा', 7, 6, ['chintu', 'buddy']),
  villa('study', 'Study', 'अध्ययन कक्ष', 7, 6, ['chikki']),
  villa('activity', 'Activity room', 'गतिविधि कक्ष', 10, 8, ['chintu', 'chikki', 'mitthu']),
  villa('bathroom', 'Bathroom', 'स्नानघर', 5, 4, []),
  villa('terrace', 'Terrace', 'छत', 10, 8, ['mitthu'], 'terrace'),
  { ...loc('villa.driveway', 'home', 'Driveway', 'ड्राइववे', 8, 10, ['buddy'], 'garden.day'), parent: 'villa.exterior' },
  loc('garden.flowers', 'garden', 'Flower garden', 'फूलों का बगीचा', 10, 8, ['chikki'], 'garden.day'),
  loc('garden.vegetables', 'garden', 'Vegetable garden', 'सब्ज़ी का बगीचा', 10, 8, ['gauri'], 'garden.day'),
  loc('garden.fruit', 'garden', 'Fruit garden', 'फलों का बगीचा', 10, 8, ['chintu'], 'garden.day'),
  loc('garden.butterfly', 'garden', 'Butterfly corner', 'तितली कोना', 6, 6, [], 'garden.day'),
  loc('garden.greenhouse', 'garden', 'Greenhouse', 'ग्रीनहाउस', 8, 6, ['dadaji'], 'villa.inside'),
  loc('garden.pond', 'garden', 'Pond', 'तालाब', 8, 6, ['buddy'], 'pond'),
  loc('garden.fountain', 'garden', 'Fountain', 'फव्वारा', 6, 6, [], 'pond'),
  loc('garden.workshop', 'garden', 'Garden workshop', 'बगीचे की कार्यशाला', 6, 5, ['dadaji'], 'villa.inside'),
  loc('garden.compost', 'garden', 'Composting corner', 'खाद कोना', 5, 5, [], 'garden.day'),
  loc('animalia.dog', 'animalia', "Buddy's corner", 'बडी का कोना', 6, 6, ['buddy'], 'garden.day'),
  loc('animalia.rabbit', 'animalia', "Chikki's enclosure", 'चिक्की का बाड़ा', 6, 6, ['chikki'], 'garden.day'),
  loc('animalia.cowshed', 'animalia', 'Cow shelter', 'गौशाला', 10, 8, ['gauri', 'nandu'], 'cowshed'),
  loc('animalia.calf', 'animalia', "Nandu's paddock", 'नंदू का मैदान', 8, 6, ['nandu'], 'garden.day'),
  loc('animalia.wild', 'animalia', 'Wildlife hide', 'वन्यजीव अवलोकन', 8, 6, [], 'forest'),
  loc('town.public_garden', 'sports', 'Public garden', 'सार्वजनिक बगीचा', 14, 10, ['buddy', 'chintu'], 'park'),
  loc('town.library', 'discovery', 'Public library', 'सार्वजनिक पुस्तकालय', 12, 8, ['chikki'], 'library'),
  loc('town.temple', 'temple', 'Temple and cultural courtyard', 'मंदिर और सांस्कृतिक प्रांगण', 12, 10, ['nandu'], 'temple'),
  loc('town.bazaar', 'sanskriti', 'Bazaar', 'बाज़ार', 12, 8, ['gauri'], 'town'),
  loc('town.festival_ground', 'sanskriti', 'Festival ground', 'मेला मैदान', 12, 10, ['chintu', 'nandu'], 'town'),
  loc('excursion.space', 'discovery', 'Space', 'अंतरिक्ष', 1, 1, [], 'space', 'side'),
  loc('excursion.museum', 'discovery', 'Museum', 'संग्रहालय', 1, 1, [], 'library', 'side'),
  loc('excursion.forest', 'discovery', 'Forest', 'जंगल', 1, 1, [], 'forest', 'side'),
  loc('excursion.ocean', 'discovery', 'Ocean', 'समुद्र', 1, 1, [], 'ocean', 'side'),
  loc('excursion.mountains', 'discovery', 'Mountains', 'पहाड़', 1, 1, ['mitthu'], 'mountain', 'side'),
  loc('excursion.monument', 'discovery', 'Monuments', 'स्मारक', 1, 1, [], 'town', 'side'),
];

function deriveItem(kind: ContentKind, body: Record<string, unknown>) {
  const meta = (body.meta ?? {}) as Partial<{ section: string; subject: string; topic: string; bands: string[]; difficulty: number; languages: string[]; rights: 'original'; provenance: string }>;
  if (kind === 'lesson' || kind === 'story' || kind === 'assignment') {
    return { section: meta.section ?? null, subject: meta.subject ?? null, topic: meta.topic ?? null, bands: meta.bands ?? [], difficulty: meta.difficulty ?? 1, languages: meta.languages ?? ['en'], rights: meta.rights ?? ('original' as const), provenance: meta.provenance ?? '' };
  }
  return { section: null, subject: null, topic: null, bands: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'], difficulty: 1, languages: ['en', 'hi'], rights: 'original' as const, provenance: 'DADU original' };
}

export async function seedDadu(db: Db, adminId: string | null = null) {
  const items: { id: string; kind: ContentKind; body: Record<string, unknown> }[] = [
    ...CHARACTERS.map((c) => ({ id: c.key, kind: 'character' as const, body: c })),
    ...LOCATIONS.map((l) => ({ id: l.id, kind: 'location' as const, body: l })),
    ...SEED_LESSONS.map((l) => ({ id: (l.meta as { id: string }).id, kind: 'lesson' as const, body: l })),
    ...SEED_ASSIGNMENTS.map((a) => ({ id: (a.meta as { id: string }).id, kind: 'assignment' as const, body: a })),
  ];
  let n = 0;
  for (const it of items) {
    const body = bodyForKind[it.kind].parse(it.body) as Record<string, unknown>;
    await db.transaction(async (tx) => {
      await tx
        .insert(daduContentItems)
        .values({ id: it.id, kind: it.kind, ...deriveItem(it.kind, body), status: 'published', currentVersion: 1, publishedVersion: 1, createdBy: adminId, updatedBy: adminId })
        .onConflictDoUpdate({ target: daduContentItems.id, set: { ...deriveItem(it.kind, body), updatedAt: sql`now()` } });
      await tx
        .insert(daduContentVersions)
        .values({ itemId: it.id, version: 1, body, changeNote: 'Seeded', createdBy: adminId, publishedAt: new Date() })
        .onConflictDoUpdate({ target: [daduContentVersions.itemId, daduContentVersions.version], set: { body } });
    });
    n++;
  }
  return { items: n, characters: CHARACTERS.length, locations: LOCATIONS.length, lessons: SEED_LESSONS.length, assignments: SEED_ASSIGNMENTS.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const database = createDatabase(url, 1);
  seedDadu(database.db)
    .then(async (r) => {
      console.log(`Seeded ${r.items} DADU content items (${r.characters} characters, ${r.locations} locations, ${r.lessons} lessons, ${r.assignments} assignments).`);
      await database.close();
    })
    .catch(async (err) => {
      console.error('Seed failed:', err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}

