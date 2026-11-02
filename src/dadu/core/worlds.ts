// The twelve interconnected domains of the multiverse and the eight learning
// sections they are built on. A single registry; nothing is duplicated.
import type { CharacterKey } from './characters';

export type SectionKey = 'academic' | 'stem' | 'music' | 'art' | 'sports' | 'nature' | 'mind' | 'explore';
export type WorldKey =
  | 'home' | 'garden' | 'animalia' | 'academy' | 'stemlab' | 'studio'
  | 'sports' | 'storyland' | 'sanskriti' | 'temple' | 'discovery' | 'play';

export interface Section {
  key: SectionKey;
  name: { en: string; hi: string };
  colour: string;
  motif: string;
}

export const SECTIONS: Section[] = [
  { key: 'academic', name: { en: 'Academic Learning', hi: 'पढ़ाई-लिखाई' }, colour: '#2F3C7E', motif: 'slate' },
  { key: 'stem', name: { en: 'STEM and Technology', hi: 'विज्ञान-तकनीक' }, colour: '#2E86AB', motif: 'gear' },
  { key: 'music', name: { en: 'Music and Performing Arts', hi: 'संगीत और कला' }, colour: '#E07A95', motif: 'tabla' },
  { key: 'art', name: { en: 'Art and Creativity', hi: 'कला और रचना' }, colour: '#8E4585', motif: 'brush' },
  { key: 'sports', name: { en: 'Sports and Fitness', hi: 'खेल और सेहत' }, colour: '#D9663D', motif: 'bat' },
  { key: 'nature', name: { en: 'Nature and Life Skills', hi: 'प्रकृति और जीवन कौशल' }, colour: '#4E9F3D', motif: 'sapling' },
  { key: 'mind', name: { en: 'Cognitive and Social Skills', hi: 'सोच और समाज' }, colour: '#E0901C', motif: 'puzzle' },
  { key: 'explore', name: { en: 'Knowledge and Exploration', hi: 'ज्ञान और खोज' }, colour: '#C98310', motif: 'telescope' },
];

export interface World {
  key: WorldKey;
  name: { en: string; hi: string };
  tagline: { en: string; hi: string };
  colour: string;
  /** Learning sections this world draws its lessons from (never a separate curriculum). */
  sections: SectionKey[];
  /** Location IDs (see locations.ts) that belong to this world. */
  locations: string[];
  /** Characters who usually accompany Dadaji here. */
  companions: CharacterKey[];
  /** Parent-controlled optional world (off by default for A0–A1). */
  optional?: boolean;
  /** Interface modes in which the world is shown in the hub. */
  modes: ('lap' | 'little' | 'explorer')[];
}

export const WORLDS: World[] = [
  { key: 'home', name: { en: 'Home and Family', hi: 'घर और परिवार' }, tagline: { en: 'The villa, its rooms and daily life', hi: 'विला, कमरे और रोज़मर्रा' }, colour: '#D9663D', sections: ['nature', 'academic', 'mind'], locations: ['villa.veranda', 'villa.living', 'villa.kitchen', 'villa.dining', 'villa.bedroom_dadaji', 'villa.bedroom_chintu', 'villa.study', 'villa.activity', 'villa.bathroom', 'villa.terrace'], companions: ['chintu', 'buddy'], modes: ['lap', 'little', 'explorer'] },
  { key: 'garden', name: { en: 'Garden and Nature', hi: 'बगीचा और प्रकृति' }, tagline: { en: 'Plant, water, grow, harvest', hi: 'बोओ, सींचो, उगाओ, काटो' }, colour: '#4E9F3D', sections: ['nature', 'academic'], locations: ['garden.flowers', 'garden.vegetables', 'garden.fruit', 'garden.butterfly', 'garden.greenhouse', 'garden.pond', 'garden.fountain', 'garden.workshop', 'garden.compost'], companions: ['gauri', 'chintu'], modes: ['lap', 'little', 'explorer'] },
  { key: 'animalia', name: { en: 'Animalia', hi: 'पशु-संसार' }, tagline: { en: 'Buddy, Chikki, Gauri and Nandu need you', hi: 'बडी, चिक्की, गौरी और नंदू को आपकी ज़रूरत है' }, colour: '#A5733F', sections: ['nature', 'mind'], locations: ['animalia.dog', 'animalia.rabbit', 'animalia.cowshed', 'animalia.calf', 'animalia.wild'], companions: ['buddy', 'chikki', 'gauri', 'nandu'], modes: ['lap', 'little', 'explorer'] },
  { key: 'academy', name: { en: 'Academic Learning', hi: 'पढ़ाई-लिखाई' }, tagline: { en: 'Maths, languages, science, social studies', hi: 'गणित, भाषा, विज्ञान, समाज' }, colour: '#2F3C7E', sections: ['academic'], locations: ['villa.study', 'villa.living'], companions: ['chikki'], modes: ['little', 'explorer'] },
  { key: 'stemlab', name: { en: 'STEM Lab', hi: 'स्टेम लैब' }, tagline: { en: 'Code, circuits, robots, experiments', hi: 'कोड, परिपथ, रोबोट, प्रयोग' }, colour: '#2E86AB', sections: ['stem'], locations: ['villa.activity'], companions: ['buddy'], modes: ['explorer'] },
  { key: 'studio', name: { en: 'Creative Studio', hi: 'रचना स्टूडियो' }, tagline: { en: 'Draw, paint, sing, dance, make', hi: 'चित्र, रंग, गाना, नृत्य, शिल्प' }, colour: '#8E4585', sections: ['art', 'music'], locations: ['villa.activity', 'villa.terrace'], companions: ['chikki', 'nandu', 'mitthu'], modes: ['lap', 'little', 'explorer'] },
  { key: 'sports', name: { en: 'Sports and Fitness', hi: 'खेल और सेहत' }, tagline: { en: 'Cricket, yoga, kabaddi, balance', hi: 'क्रिकेट, योग, कबड्डी, संतुलन' }, colour: '#D9663D', sections: ['sports'], locations: ['town.public_garden', 'villa.driveway', 'villa.terrace'], companions: ['buddy'], modes: ['little', 'explorer'] },
  { key: 'storyland', name: { en: 'Storyland', hi: 'कहानी-लोक' }, tagline: { en: "Dadaji's Story Corner", hi: 'दादाजी की कहानियाँ' }, colour: '#8B5A2B', sections: ['academic', 'mind'], locations: ['villa.bedroom_chintu', 'town.library'], companions: ['chintu', 'chikki'], modes: ['lap', 'little', 'explorer'] },
  { key: 'sanskriti', name: { en: 'Sanskriti', hi: 'संस्कृति' }, tagline: { en: 'Festivals, food, clothes, folk arts, monuments', hi: 'त्योहार, खाना, पहनावा, लोक कला, स्मारक' }, colour: '#F4A523', sections: ['explore', 'art', 'music'], locations: ['town.bazaar', 'town.festival_ground'], companions: ['gauri', 'chintu'], modes: ['little', 'explorer'] },
  { key: 'temple', name: { en: 'Wisdom Temple', hi: 'ज्ञान मंदिर' }, tagline: { en: 'Stories, history and belief, kept apart', hi: 'कथा, इतिहास और मान्यता, अलग-अलग' }, colour: '#C98310', sections: ['explore'], locations: ['town.temple'], companions: ['nandu'], optional: true, modes: ['little', 'explorer'] },
  { key: 'discovery', name: { en: 'Discovery World', hi: 'खोज की दुनिया' }, tagline: { en: 'Library, museums, space, oceans, dinosaurs', hi: 'पुस्तकालय, संग्रहालय, अंतरिक्ष, समुद्र, डायनासोर' }, colour: '#2E86AB', sections: ['explore', 'academic'], locations: ['town.library', 'excursion.space', 'excursion.museum', 'excursion.forest', 'excursion.ocean', 'excursion.mountains', 'excursion.monument'], companions: ['chikki', 'buddy'], modes: ['little', 'explorer'] },
  { key: 'play', name: { en: 'Play and Friendship', hi: 'खेल और दोस्ती' }, tagline: { en: 'Puzzles, memory, mazes, empathy', hi: 'पहेलियाँ, याद, भूलभुलैया, सहानुभूति' }, colour: '#E0901C', sections: ['mind'], locations: ['villa.activity', 'town.public_garden'], companions: ['buddy', 'chikki'], modes: ['lap', 'little', 'explorer'] },
];

export const WORLD_BY_KEY: Record<WorldKey, World> = Object.fromEntries(WORLDS.map((w) => [w.key, w])) as Record<WorldKey, World>;

export function worldsForMode(mode: 'lap' | 'little' | 'explorer', templeEnabled: boolean): World[] {
  return WORLDS.filter((w) => w.modes.includes(mode) && (!w.optional || templeEnabled));
}

/** Cross-links: which worlds a lesson in a section lights up. */
export function worldsForSection(section: SectionKey): WorldKey[] {
  return WORLDS.filter((w) => w.sections.includes(section)).map((w) => w.key);
}
