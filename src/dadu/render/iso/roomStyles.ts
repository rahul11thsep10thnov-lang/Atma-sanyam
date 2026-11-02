// Backdrops per location: interior rooms get two back walls and a floor
// material; exteriors get sky, hills and a ground material.
import { palette } from '../palette';

export interface RoomStyle {
  kind: 'interior' | 'exterior';
  floor: string; floorAlt: string; floorLine: string;
  wall?: string; wallDark?: string; trim?: string; wallHeight?: number;
  /** Windows on the north-west wall as fractions along its length. */
  windows?: number[];
  ground?: 'grass' | 'soil' | 'stone' | 'sand' | 'water';
}

const interior = (floor: string, floorAlt: string, wall: string, trim: string, windows: number[] = [0.5]): RoomStyle => ({
  kind: 'interior', floor, floorAlt, floorLine: floor, wall, wallDark: wall, trim, wallHeight: 150, windows,
});
const exterior = (floor: string, floorAlt: string, ground: RoomStyle['ground'] = 'grass'): RoomStyle => ({ kind: 'exterior', floor, floorAlt, floorLine: floorAlt, ground });

export const ROOM_STYLES: Record<string, RoomStyle> = {
  'villa.veranda': { ...exterior('#E9D9C0', '#E2CFB0', 'stone'), kind: 'interior', wall: '#FFF6EA', wallDark: '#F1E6D4', trim: '#8B5A2B', wallHeight: 130, windows: [0.3, 0.7] },
  'villa.living': interior('#F3E6D0', '#EAD9BF', '#F7E9D3', '#2F3C7E', [0.35, 0.72]),
  'villa.kitchen': interior('#DDE3E8', '#CFD6DC', '#EAF5FA', '#2E86AB', [0.6]),
  'villa.dining': interior('#F0DEC2', '#E6D0AE', '#FFF1DC', '#D9663D', [0.5]),
  'villa.bedroom_dadaji': interior('#E9D9C0', '#DFCCAE', '#F4ECDE', '#8B5A2B', [0.6]),
  'villa.bedroom_chintu': interior('#DDF2FB', '#CDE9F5', '#EAF6FF', '#2E86AB', [0.4]),
  'villa.study': interior('#E6D7BF', '#DCCBAE', '#FFF8EE', '#2F3C7E', [0.5]),
  'villa.activity': interior('#FFF3DC', '#F6E7C8', '#FFFBF2', '#8E4585', [0.3, 0.7]),
  'villa.bathroom': interior('#E3F2F8', '#D4E9F1', '#F2FAFD', '#2E86AB', [0.5]),
  'villa.terrace': { ...exterior('#E9D9C0', '#E0CFAE', 'stone'), kind: 'exterior' },
  'villa.exterior': exterior('#7FBF55', '#72B249'),
  'villa.driveway': exterior('#D9C4A4', '#CDB58F', 'stone'),
  'garden.greenhouse': interior('#8B5A2B', '#7A4E2A', '#DDF2FB', '#8CCBE0', [0.25, 0.5, 0.75]),
  'garden.workshop': interior('#C9B698', '#B9A58A', '#E9D9C0', '#8B5A2B', [0.5]),
  'town.library': interior('#D4A06A', '#C98A5B', '#FFF3DC', '#8B5A2B', [0.3, 0.7]),
  'animalia.cowshed': exterior('#C9A071', '#B98F5F', 'soil'),
  'town.temple': { ...exterior('#E9D9C0', '#DEC9A4', 'stone') },
  'town.bazaar': { ...exterior('#D9C4A4', '#CDB58F', 'stone') },
  'town.festival_ground': { ...exterior('#8BC34A', '#7FB542') },
  'town.public_garden': exterior('#8BC34A', '#7FB542'),
  'garden.pond': exterior('#7FBF55', '#72B249'),
  'garden.compost': exterior('#A5733F', '#95662F', 'soil'),
  map: exterior('#9CCB6B', '#8FBF5F'),
};

export function roomStyle(locationId: string): RoomStyle {
  if (ROOM_STYLES[locationId]) return ROOM_STYLES[locationId];
  if (locationId.startsWith('garden.')) return exterior('#7FBF55', '#72B249');
  if (locationId.startsWith('animalia.')) return exterior('#A8D27A', '#9BC66B');
  if (locationId.startsWith('villa.')) return interior('#F3E6D0', '#EAD9BF', '#F7E9D3', palette.indigo);
  return exterior('#9CCB6B', '#8FBF5F');
}
