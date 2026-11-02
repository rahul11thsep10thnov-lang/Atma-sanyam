// Location registry: every navigable place in the Miniverse with its isometric
// footprint, its world and the characters who idle there. Objects are
// registered by the content layer (src/dadu/content/objects.ts) against these IDs.
import type { CharacterKey } from './characters';
import type { WorldKey } from './worlds';

export type CameraKind = 'iso' | 'side';

export interface LocationSpec {
  id: string;
  world: WorldKey;
  name: { en: string; hi: string };
  /** Isometric footprint in tiles (width × depth). */
  size: { w: number; d: number };
  /** Entry tile for characters arriving from the map. */
  entry: { x: number; y: number };
  /** Parent location for rooms inside the villa; exterior locations have none. */
  parent?: string;
  /** Default camera when the location opens. Activities always open side-view. */
  camera: CameraKind;
  idlers: CharacterKey[];
  /** Ambient sound set key (see audio engine). */
  ambience: string;
}

const villa = (id: string, en: string, hi: string, w: number, d: number, idlers: CharacterKey[], ambience = 'villa.inside'): LocationSpec => ({
  id: `villa.${id}`, world: 'home', name: { en, hi }, size: { w, d }, entry: { x: Math.floor(w / 2), y: d - 1 }, parent: 'villa.exterior', camera: 'iso', idlers, ambience,
});

export const LOCATIONS: LocationSpec[] = [
  { id: 'map', world: 'home', name: { en: 'The Miniverse', hi: 'मिनीवर्स' }, size: { w: 24, d: 16 }, entry: { x: 12, y: 15 }, camera: 'iso', idlers: [], ambience: 'town' },
  { id: 'villa.exterior', world: 'home', name: { en: "Dadaji's villa", hi: 'दादाजी का विला' }, size: { w: 16, d: 12 }, entry: { x: 8, y: 11 }, camera: 'iso', idlers: ['buddy'], ambience: 'garden.day' },
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
  { id: 'villa.driveway', world: 'home', name: { en: 'Driveway', hi: 'ड्राइववे' }, size: { w: 8, d: 10 }, entry: { x: 4, y: 9 }, parent: 'villa.exterior', camera: 'iso', idlers: ['buddy'], ambience: 'garden.day' },
  // Garden and nature
  { id: 'garden.flowers', world: 'garden', name: { en: 'Flower garden', hi: 'फूलों का बगीचा' }, size: { w: 10, d: 8 }, entry: { x: 5, y: 7 }, camera: 'iso', idlers: ['chikki'], ambience: 'garden.day' },
  { id: 'garden.vegetables', world: 'garden', name: { en: 'Vegetable garden', hi: 'सब्ज़ी का बगीचा' }, size: { w: 10, d: 8 }, entry: { x: 5, y: 7 }, camera: 'iso', idlers: ['gauri'], ambience: 'garden.day' },
  { id: 'garden.fruit', world: 'garden', name: { en: 'Fruit garden', hi: 'फलों का बगीचा' }, size: { w: 10, d: 8 }, entry: { x: 5, y: 7 }, camera: 'iso', idlers: ['chintu'], ambience: 'garden.day' },
  { id: 'garden.butterfly', world: 'garden', name: { en: 'Butterfly corner', hi: 'तितली कोना' }, size: { w: 6, d: 6 }, entry: { x: 3, y: 5 }, camera: 'iso', idlers: [], ambience: 'garden.day' },
  { id: 'garden.greenhouse', world: 'garden', name: { en: 'Greenhouse', hi: 'ग्रीनहाउस' }, size: { w: 8, d: 6 }, entry: { x: 4, y: 5 }, camera: 'iso', idlers: ['dadaji'], ambience: 'villa.inside' },
  { id: 'garden.pond', world: 'garden', name: { en: 'Pond', hi: 'तालाब' }, size: { w: 8, d: 6 }, entry: { x: 4, y: 5 }, camera: 'iso', idlers: ['buddy'], ambience: 'pond' },
  { id: 'garden.fountain', world: 'garden', name: { en: 'Fountain', hi: 'फव्वारा' }, size: { w: 6, d: 6 }, entry: { x: 3, y: 5 }, camera: 'iso', idlers: [], ambience: 'pond' },
  { id: 'garden.workshop', world: 'garden', name: { en: 'Garden workshop', hi: 'बगीचे की कार्यशाला' }, size: { w: 6, d: 5 }, entry: { x: 3, y: 4 }, camera: 'iso', idlers: ['dadaji'], ambience: 'villa.inside' },
  { id: 'garden.compost', world: 'garden', name: { en: 'Composting corner', hi: 'खाद कोना' }, size: { w: 5, d: 5 }, entry: { x: 2, y: 4 }, camera: 'iso', idlers: [], ambience: 'garden.day' },
  // Animalia
  { id: 'animalia.dog', world: 'animalia', name: { en: "Buddy's corner", hi: 'बडी का कोना' }, size: { w: 6, d: 6 }, entry: { x: 3, y: 5 }, camera: 'iso', idlers: ['buddy'], ambience: 'garden.day' },
  { id: 'animalia.rabbit', world: 'animalia', name: { en: "Chikki's enclosure", hi: 'चिक्की का बाड़ा' }, size: { w: 6, d: 6 }, entry: { x: 3, y: 5 }, camera: 'iso', idlers: ['chikki'], ambience: 'garden.day' },
  { id: 'animalia.cowshed', world: 'animalia', name: { en: 'Cow shelter', hi: 'गौशाला' }, size: { w: 10, d: 8 }, entry: { x: 5, y: 7 }, camera: 'iso', idlers: ['gauri', 'nandu'], ambience: 'cowshed' },
  { id: 'animalia.calf', world: 'animalia', name: { en: "Nandu's paddock", hi: 'नंदू का मैदान' }, size: { w: 8, d: 6 }, entry: { x: 4, y: 5 }, camera: 'iso', idlers: ['nandu'], ambience: 'garden.day' },
  { id: 'animalia.wild', world: 'animalia', name: { en: 'Wildlife hide', hi: 'वन्यजीव अवलोकन' }, size: { w: 8, d: 6 }, entry: { x: 4, y: 5 }, camera: 'iso', idlers: [], ambience: 'forest' },
  // Town
  { id: 'town.public_garden', world: 'sports', name: { en: 'Public garden', hi: 'सार्वजनिक बगीचा' }, size: { w: 14, d: 10 }, entry: { x: 7, y: 9 }, camera: 'iso', idlers: ['buddy', 'chintu'], ambience: 'park' },
  { id: 'town.library', world: 'discovery', name: { en: 'Public library', hi: 'सार्वजनिक पुस्तकालय' }, size: { w: 12, d: 8 }, entry: { x: 6, y: 7 }, camera: 'iso', idlers: ['chikki'], ambience: 'library' },
  { id: 'town.temple', world: 'temple', name: { en: 'Temple and cultural courtyard', hi: 'मंदिर और सांस्कृतिक प्रांगण' }, size: { w: 12, d: 10 }, entry: { x: 6, y: 9 }, camera: 'iso', idlers: ['nandu'], ambience: 'temple' },
  { id: 'town.bazaar', world: 'sanskriti', name: { en: 'Bazaar', hi: 'बाज़ार' }, size: { w: 12, d: 8 }, entry: { x: 6, y: 7 }, camera: 'iso', idlers: ['gauri'], ambience: 'town' },
  { id: 'town.festival_ground', world: 'sanskriti', name: { en: 'Festival ground', hi: 'मेला मैदान' }, size: { w: 12, d: 10 }, entry: { x: 6, y: 9 }, camera: 'iso', idlers: ['chintu', 'nandu'], ambience: 'town' },
  // Excursions (side-view scenes with a fixed camera)
  { id: 'excursion.space', world: 'discovery', name: { en: 'Space', hi: 'अंतरिक्ष' }, size: { w: 1, d: 1 }, entry: { x: 0, y: 0 }, camera: 'side', idlers: [], ambience: 'space' },
  { id: 'excursion.museum', world: 'discovery', name: { en: 'Museum', hi: 'संग्रहालय' }, size: { w: 1, d: 1 }, entry: { x: 0, y: 0 }, camera: 'side', idlers: [], ambience: 'library' },
  { id: 'excursion.forest', world: 'discovery', name: { en: 'Forest', hi: 'जंगल' }, size: { w: 1, d: 1 }, entry: { x: 0, y: 0 }, camera: 'side', idlers: [], ambience: 'forest' },
  { id: 'excursion.ocean', world: 'discovery', name: { en: 'Ocean', hi: 'समुद्र' }, size: { w: 1, d: 1 }, entry: { x: 0, y: 0 }, camera: 'side', idlers: [], ambience: 'ocean' },
  { id: 'excursion.mountains', world: 'discovery', name: { en: 'Mountains', hi: 'पहाड़' }, size: { w: 1, d: 1 }, entry: { x: 0, y: 0 }, camera: 'side', idlers: ['mitthu'], ambience: 'mountain' },
  { id: 'excursion.monument', world: 'discovery', name: { en: 'Monuments', hi: 'स्मारक' }, size: { w: 1, d: 1 }, entry: { x: 0, y: 0 }, camera: 'side', idlers: [], ambience: 'town' },
];

export const LOCATION_BY_ID: Record<string, LocationSpec> = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

/** v2 location IDs (house.*) map onto the villa so stored progress keeps working. */
const LEGACY_LOCATIONS: Record<string, string> = {
  'house.veranda': 'villa.veranda', 'house.living_room': 'villa.living', 'house.study': 'villa.study', 'house.lab': 'villa.activity',
  'house.music_room': 'villa.activity', 'house.art_room': 'villa.activity', 'house.kitchen': 'villa.kitchen', 'house.dining': 'villa.dining',
  'house.bedroom': 'villa.bedroom_chintu', 'house.playroom': 'villa.activity', 'house.bathroom': 'villa.bathroom', 'house.cowshed': 'animalia.cowshed',
  'house.store': 'garden.workshop', 'house.garden': 'garden.vegetables', 'house.terrace': 'villa.terrace', 'town.excursions': 'excursion.space',
};

export function canonicalLocation(id: string): string {
  if (id in LOCATION_BY_ID) return id;
  if (id in LEGACY_LOCATIONS) return LEGACY_LOCATIONS[id];
  // object IDs are location.object: resolve the location part
  const parts = id.split('.');
  while (parts.length > 1) {
    parts.pop();
    const cand = parts.join('.');
    if (cand in LEGACY_LOCATIONS) return LEGACY_LOCATIONS[cand];
    if (cand in LOCATION_BY_ID) return cand;
  }
  return id;
}
