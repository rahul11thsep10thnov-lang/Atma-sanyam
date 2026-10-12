// The rendered packs and their images, by space id. Only the balcony is
// a photographed pack now; the garden is the real-time scene in
// src/garden/ and has no pack, so any lookup for it gets the balcony's
// (the generic space rules are never run for the garden).
import { ImageSourcePropType } from 'react-native';
import { SpaceId, SpacePack } from '../packTypes';
import * as balcony from './balcony.generated';
import { getLanguage } from '../../i18n';

// Hindi names for what the pack shows by name: its items, spots and focus plant.
const HI_ITEMS: Record<string, string> = {
  cane_lounge_chair: 'बेंत की आराम कुर्सी',
  teak_coffee_table: 'सागौन की कॉफ़ी टेबल',
  dhurrie_rug: 'हाथ से बुनी दरी',
  lantern: 'लोहे की लालटेन',
  daybed: 'सागौन का दीवान',
  study_set: 'पढ़ाई का कोना',
  snake_plant: 'स्नेक प्लांट',
  tulsi: 'तुलसी',
  areca_palm: 'एरेका पाम',
  pothos_hanging: 'लटकता मनी प्लांट',
  wind_chime: 'पीतल की विंड चाइम',
  wall_shelf: 'सागौन की दीवार शेल्फ़',
  art_frame: 'सागौन का फ़्रेम',
  dead_sapling: 'मुरझाया पौधा',
  broken_frame: 'टूटी तस्वीर',
};
const HI_SLOTS: Record<string, string> = {
  focus: 'फ़ोकस पौधा',
  near_left: 'दरवाज़े के पास',
  rail_mid: 'रेलिंग',
  rail_far: 'दूर की रेलिंग',
  corner_far: 'दूर का कोना',
  seating: 'बैठक',
  table: 'मेज़',
  rug: 'दरी',
  lantern: 'मेज़ के पास',
  lounge: 'शीशे के साथ',
  hang_near: 'रेलिंग का हुक',
  hang_far: 'दूर का हुक',
  art: 'चित्र की दीवार',
  shelf: 'दीवार शेल्फ़',
};
const HI_FOCUS_PLANT = 'पीस लिली';

const localized = new Map<string, SpacePack>();
function inLanguage(space: SpaceId, pack: SpacePack): SpacePack {
  const lang = getLanguage();
  if (lang === 'en') return pack;
  const key = `${space}:${lang}`;
  let out = localized.get(key);
  if (!out) {
    out = {
      ...pack,
      items: Object.fromEntries(Object.entries(pack.items).map(([id, it]) => [id, { ...it, name: HI_ITEMS[id] ?? it.name }])),
      slots: Object.fromEntries(Object.entries(pack.slots).map(([id, sl]) => [id, { ...sl, label: HI_SLOTS[id] ?? sl.label }])),
      focusPlant: { ...pack.focusPlant, name: HI_FOCUS_PLANT },
    };
    localized.set(key, out);
  }
  return out;
}

const PACKS: Partial<Record<SpaceId, { pack: SpacePack; images: Record<string, number> }>> = {
  balcony: { pack: balcony.PACK, images: balcony.IMAGES },
};

function entry(space: SpaceId) {
  return PACKS[space] ?? PACKS.balcony!;
}

/** The pack, with its names in the current language. */
export function packFor(space: SpaceId): SpacePack {
  return inLanguage(space, entry(space).pack);
}

export function img(space: SpaceId, file: string): ImageSourcePropType {
  const src = entry(space).images[file];
  if (src === undefined) throw new Error(`${space} pack has no image ${file}`);
  return src;
}

export function hasImg(space: SpaceId, file: string): boolean {
  return entry(space).images[file] !== undefined;
}
