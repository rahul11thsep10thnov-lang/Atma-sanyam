// The museum store: a curated set, never more than a hundred, in which
// every item earns its place. Each one records what it is for, where it
// can stand or hang, what it visibly changes, how it is used, what it
// costs the renderer, and why it is worth its coins. Rarity follows the
// coin system; there are no near-duplicates.
import { ArtworkRecord } from '../collection/model';
import { MuseumObject, SurfaceId, wallWidthOf } from './model';

export type MuseumCategory = 'frames' | 'lighting' | 'exhibition' | 'furniture' | 'architecture' | 'decoration' | 'heritage' | 'information' | 'security' | 'premium';
export type Rarity = 'basic' | 'premium' | 'rare' | 'epic' | 'legendary';

export type RenderKind =
  | 'frame'
  | 'spot'
  | 'wash'
  | 'floorlamp'
  | 'uplight'
  | 'pendant'
  | 'chandelier'
  | 'diya_row'
  | 'pedestal'
  | 'case'
  | 'bench'
  | 'sofa'
  | 'table'
  | 'shelf'
  | 'plant'
  | 'column'
  | 'arch'
  | 'niche'
  | 'jaali'
  | 'rug'
  | 'rope'
  | 'plaque'
  | 'sign'
  | 'statue'
  | 'vase'
  | 'bust'
  | 'bell'
  | 'mirror'
  | 'curtain'
  | 'skylight'
  | 'fountain'
  | 'camera'
  | 'sensor'
  | 'extinguisher'
  | 'torana'
  | 'rangoli'
  | 'scroll'
  | 'planter_box';

export interface Evaluation {
  utility: string;
  placement: string;
  consequence: string;
  interaction: string;
  performance: 'negligible' | 'low' | 'medium';
  value: string;
}

export interface MuseumItem {
  id: string;
  name: string;
  category: MuseumCategory;
  rarity: Rarity;
  coins: number;
  unlockMinutes: number;
  /** Where it can go; empty for a frame style (it applies to artworks). */
  surfaces: SurfaceId[];
  /** Footprint in metres (width along the wall, depth, height). */
  size: [number, number, number];
  render: RenderKind;
  /** Renderer parameters: colour, a garden sprite id for plants, etc. */
  params?: Record<string, string | number | boolean>;
  blurb: string;
  heritage?: boolean;
  /** Offers a top surface for small objects. */
  carries?: SurfaceId;
  evaluation: Evaluation;
}

const W: SurfaceId[] = ['MUSEUM_WALL'];
const F: SurfaceId[] = ['MUSEUM_FLOOR'];
const SMALL: SurfaceId[] = ['DISPLAY_PEDESTAL', 'TABLETOP', 'SHELF'];

function ev(utility: string, placement: string, consequence: string, interaction: string, performance: Evaluation['performance'], value: string): Evaluation {
  return { utility, placement, consequence, interaction, performance, value };
}

export const MUSEUM_STORE: MuseumItem[] = [
  // ---- artwork & frames -------------------------------------------------------------
  { id: 'frame_teak', name: 'Teak frame', category: 'frames', rarity: 'basic', coins: 0, unlockMinutes: 0, surfaces: [], size: [0, 0, 0], render: 'frame', params: { color: '#5a3b22', width: 1 }, blurb: 'The frame every artwork arrives in.', evaluation: ev('Default frame', 'Any artwork', 'Warm teak border', 'Change frame', 'negligible', 'Free') },
  { id: 'frame_black', name: 'Gallery black', category: 'frames', rarity: 'basic', coins: 30, unlockMinutes: 0, surfaces: [], size: [0, 0, 0], render: 'frame', params: { color: '#15120f', width: 0.8 }, blurb: 'A thin matte black frame, as in contemporary galleries.', evaluation: ev('Frame style', 'Any artwork', 'Thin dark edge, picture dominates', 'Change frame', 'negligible', 'Cheapest contemporary look') },
  { id: 'frame_white', name: 'Gallery white', category: 'frames', rarity: 'basic', coins: 30, unlockMinutes: 0, surfaces: [], size: [0, 0, 0], render: 'frame', params: { color: '#f2eee6', width: 0.9 }, blurb: 'A clean white frame that lifts a dark picture.', evaluation: ev('Frame style', 'Any artwork', 'Bright edge on dark walls', 'Change frame', 'negligible', 'Balances dark pictures') },
  { id: 'frame_gold', name: 'Gilt frame', category: 'frames', rarity: 'premium', coins: 120, unlockMinutes: 90, surfaces: [], size: [0, 0, 0], render: 'frame', params: { color: '#c9a24a', width: 1.4, metal: true }, blurb: 'A wide gilded frame with a metallic sheen.', evaluation: ev('Frame style', 'Any artwork', 'Catches spotlights, wider border', 'Change frame', 'negligible', 'Reads as a masterpiece') },
  { id: 'frame_sandalwood', name: 'Carved sandalwood', category: 'frames', rarity: 'rare', coins: 220, unlockMinutes: 240, surfaces: [], size: [0, 0, 0], render: 'frame', params: { color: '#b58a5a', width: 1.6, carved: true }, blurb: 'A carved sandalwood frame in the Mysore manner.', heritage: true, evaluation: ev('Heritage frame', 'Any artwork', 'Carved relief border', 'Change frame', 'negligible', 'Signature heritage look') },
  { id: 'frame_float', name: 'Floating mount', category: 'frames', rarity: 'premium', coins: 140, unlockMinutes: 120, surfaces: [], size: [0, 0, 0], render: 'frame', params: { color: '#2a2a2a', width: 0.5, float: true }, blurb: 'The picture floats off the wall on a hidden mount.', evaluation: ev('Frame style', 'Any artwork', 'Deeper shadow, picture stands off the wall', 'Change frame', 'negligible', 'Modern depth') },
  { id: 'frame_brass', name: 'Brass inlay', category: 'frames', rarity: 'epic', coins: 380, unlockMinutes: 420, surfaces: [], size: [0, 0, 0], render: 'frame', params: { color: '#8b6a2e', width: 1.2, metal: true, inlay: true }, blurb: 'Dark wood with a brass inlay line.', heritage: true, evaluation: ev('Frame style', 'Any artwork', 'Fine metallic line inside the border', 'Change frame', 'negligible', 'Refined heritage detail') },

  // ---- lighting ----------------------------------------------------------------------
  { id: 'spot_warm', name: 'Warm spotlight', category: 'lighting', rarity: 'basic', coins: 45, unlockMinutes: 0, surfaces: W, size: [0.3, 0.3, 0.3], render: 'spot', params: { color: '#ffd9a8', intensity: 1 }, blurb: 'A ceiling spot aimed at whatever hangs below it.', evaluation: ev('Brightens one artwork', 'Ceiling track above a wall point', 'A warm pool of light on the picture and wall', 'On/off, intensity, drag along the wall', 'low', 'The first thing a museum needs') },
  { id: 'spot_cool', name: 'Daylight spotlight', category: 'lighting', rarity: 'basic', coins: 45, unlockMinutes: 30, surfaces: W, size: [0.3, 0.3, 0.3], render: 'spot', params: { color: '#eaf2ff', intensity: 1 }, blurb: 'A cool, neutral spot for true colours.', evaluation: ev('Brightens one artwork, neutral', 'Ceiling track', 'A cool pool of light', 'On/off, intensity, drag', 'low', 'Nature and wildlife look right') },
  { id: 'spot_pair', name: 'Twin spots', category: 'lighting', rarity: 'premium', coins: 110, unlockMinutes: 90, surfaces: W, size: [0.9, 0.3, 0.3], render: 'spot', params: { color: '#ffe2bd', intensity: 1.2, twin: true }, blurb: 'Two spots on one track, for a wide picture.', evaluation: ev('Evenly lights a large artwork', 'Ceiling track', 'Two overlapping pools, no dark edges', 'On/off, intensity, drag', 'low', 'Right for size 4 and above') },
  { id: 'wash_strip', name: 'Wall wash', category: 'lighting', rarity: 'premium', coins: 150, unlockMinutes: 120, surfaces: W, size: [3, 0.2, 0.2], render: 'wash', params: { color: '#fff1dc' }, blurb: 'A cove strip that grades the whole wall from bright to soft.', evaluation: ev('Lifts a wall section', 'Top of the wall', 'A gradient that fades down the wall', 'On/off, intensity', 'low', 'Reads as a lit gallery wall') },
  { id: 'uplight', name: 'Floor uplight', category: 'lighting', rarity: 'basic', coins: 55, unlockMinutes: 45, surfaces: F, size: [0.25, 0.25, 0.15], render: 'uplight', params: { color: '#ffd2a0' }, blurb: 'A recessed uplight at the foot of the wall.', evaluation: ev('Lights a wall from below', 'Floor, by the wall', 'A rising glow on the wall', 'On/off, intensity', 'low', 'Drama for columns and arches') },
  { id: 'floor_lamp', name: 'Reading lamp', category: 'lighting', rarity: 'basic', coins: 60, unlockMinutes: 30, surfaces: F, size: [0.4, 0.4, 1.6], render: 'floorlamp', params: { color: '#ffe0b3' }, blurb: 'A tall brass lamp beside a bench.', evaluation: ev('Ambient pool for seating', 'Floor', 'A soft circle of light on the floor', 'On/off', 'low', 'Makes a corner inviting') },
  { id: 'pendant', name: 'Linen pendant', category: 'lighting', rarity: 'premium', coins: 130, unlockMinutes: 150, surfaces: F, size: [0.6, 0.6, 0.5], render: 'pendant', params: { color: '#ffe9cf' }, blurb: 'A drum pendant hung from the ceiling over the floor.', evaluation: ev('General light for a section', 'Ceiling over the floor', 'Even warm light over the floor', 'On/off, intensity', 'low', 'One per section is enough') },
  { id: 'chandelier', name: 'Crystal chandelier', category: 'lighting', rarity: 'epic', coins: 520, unlockMinutes: 600, surfaces: F, size: [1.2, 1.2, 1.1], render: 'chandelier', params: { color: '#fff4e0' }, blurb: 'A tiered chandelier from a Rajput palace hall.', heritage: true, evaluation: ev('Centrepiece light', 'Ceiling, centre of a section', 'Sparkle and a broad warm light', 'On/off, intensity', 'medium', 'The grandest light available') },
  { id: 'diya_row', name: 'Row of diyas', category: 'lighting', rarity: 'premium', coins: 90, unlockMinutes: 60, surfaces: F, size: [1.6, 0.15, 0.1], render: 'diya_row', params: { color: '#ffb562' }, blurb: 'Seven brass lamps flickering along the wall foot.', heritage: true, evaluation: ev('Festive accent light', 'Floor, along the wall', 'Flicker and warm glow at the base of the wall', 'On/off', 'low', 'Festival mood for a few coins') },

  // ---- exhibition ------------------------------------------------------------------
  { id: 'pedestal_stone', name: 'Stone pedestal', category: 'exhibition', rarity: 'basic', coins: 50, unlockMinutes: 0, surfaces: F, size: [0.5, 0.5, 1.0], render: 'pedestal', params: { color: '#d9d2c5' }, blurb: 'A plain plinth for a small object.', carries: 'DISPLAY_PEDESTAL', evaluation: ev('Holds one small object', 'Floor', 'Raises a bust or vase to eye level', 'Drag, rotate; carries an object', 'negligible', 'Needed before busts and vases') },
  { id: 'pedestal_black', name: 'Black pedestal', category: 'exhibition', rarity: 'basic', coins: 55, unlockMinutes: 30, surfaces: F, size: [0.5, 0.5, 1.1], render: 'pedestal', params: { color: '#1b1917' }, blurb: 'A matte black plinth.', carries: 'DISPLAY_PEDESTAL', evaluation: ev('Holds one small object', 'Floor', 'Dark base under a lit object', 'Drag, rotate; carries', 'negligible', 'Contemporary counterpart of stone') },
  { id: 'case_glass', name: 'Glass case', category: 'exhibition', rarity: 'premium', coins: 140, unlockMinutes: 120, surfaces: F, size: [0.8, 0.6, 1.4], render: 'case', params: { color: '#e9f0f2' }, blurb: 'A vitrine on a base, glass on four sides.', carries: 'DISPLAY_CASE', evaluation: ev('Protects a precious object', 'Floor', 'Reflections and a guarded feel', 'Drag, rotate; carries', 'low', 'Museum credibility') },
  { id: 'case_long', name: 'Long vitrine', category: 'exhibition', rarity: 'rare', coins: 240, unlockMinutes: 300, surfaces: F, size: [1.8, 0.6, 1.0], render: 'case', params: { color: '#e9f0f2', long: true }, blurb: 'A low, long table case for scrolls and relics.', carries: 'DISPLAY_CASE', evaluation: ev('Holds two small objects', 'Floor', 'Table-height glass', 'Drag, rotate; carries two', 'low', 'A reading-table display') },
  { id: 'easel_display', name: 'Display easel', category: 'exhibition', rarity: 'basic', coins: 40, unlockMinutes: 0, surfaces: F, size: [0.7, 0.6, 1.7], render: 'pedestal', params: { color: '#6b4a2b', easel: true }, blurb: 'A wooden easel that holds one artwork off the wall.', evaluation: ev('Shows an artwork on the floor', 'Floor', 'An artwork leaning, not hung', 'Drag, rotate', 'negligible', 'Extra artwork spots per section') },
  { id: 'rope_stanchion', name: 'Rope barrier', category: 'exhibition', rarity: 'basic', coins: 35, unlockMinutes: 0, surfaces: F, size: [1.6, 0.15, 0.95], render: 'rope', params: { color: '#8a1f2b' }, blurb: 'Two brass posts and a velvet rope.', evaluation: ev('Marks a protected artwork', 'Floor, before a wall', 'A rope line in front of a picture', 'Drag, rotate', 'negligible', 'Reads as valuable') },
  { id: 'plinth_wide', name: 'Wide plinth', category: 'exhibition', rarity: 'premium', coins: 120, unlockMinutes: 180, surfaces: F, size: [1.6, 0.8, 0.45], render: 'pedestal', params: { color: '#cfc6b6', wide: true }, blurb: 'A low broad base for a statue.', carries: 'DISPLAY_PEDESTAL', evaluation: ev('Base for a large sculpture', 'Floor', 'A statue looks installed, not dropped', 'Drag, rotate; carries', 'negligible', 'Needed for Nandi and the elephant') },

  // ---- furniture -------------------------------------------------------------------
  { id: 'bench_oak', name: 'Gallery bench', category: 'furniture', rarity: 'basic', coins: 60, unlockMinutes: 0, surfaces: F, size: [1.6, 0.5, 0.45], render: 'bench', params: { color: '#8c6a48' }, blurb: 'A long bench to sit before a picture.', evaluation: ev('Seating', 'Floor, centre of a section', 'Invites a pause in front of the wall', 'Drag, rotate', 'negligible', 'Every section wants one') },
  { id: 'bench_leather', name: 'Leather ottoman', category: 'furniture', rarity: 'premium', coins: 130, unlockMinutes: 120, surfaces: F, size: [1.2, 1.2, 0.45], render: 'sofa', params: { color: '#5a3426' }, blurb: 'A square leather seat for four.', evaluation: ev('Seating', 'Floor', 'A soft dark block in the centre', 'Drag, rotate', 'negligible', 'Luxury seating') },
  { id: 'table_side', name: 'Side table', category: 'furniture', rarity: 'basic', coins: 45, unlockMinutes: 30, surfaces: F, size: [0.5, 0.5, 0.6], render: 'table', params: { color: '#6a4a30' }, blurb: 'A round table that holds one small object.', carries: 'TABLETOP', evaluation: ev('Holds a small object', 'Floor, beside seating', 'Somewhere for a vase or lamp', 'Drag; carries', 'negligible', 'Cheapest surface') },
  { id: 'shelf_wall', name: 'Wall shelf', category: 'furniture', rarity: 'basic', coins: 50, unlockMinutes: 45, surfaces: W, size: [1.2, 0.25, 0.05], render: 'shelf', params: { color: '#7a5636' }, blurb: 'A floating shelf for two small objects.', carries: 'SHELF', evaluation: ev('Holds two small objects on the wall', 'Wall, below artworks', 'Objects between pictures', 'Drag; carries two', 'negligible', 'Uses wall space well') },
  { id: 'daybed_teak', name: 'Teak daybed', category: 'furniture', rarity: 'rare', coins: 260, unlockMinutes: 360, surfaces: F, size: [2.0, 0.9, 0.5], render: 'sofa', params: { color: '#7a5436', daybed: true }, blurb: 'A carved daybed with bolsters.', heritage: true, evaluation: ev('Seating, heritage', 'Floor', 'A large warm piece', 'Drag, rotate', 'negligible', 'A heritage centrepiece') },

  // ---- architecture ----------------------------------------------------------------
  { id: 'column_plain', name: 'Stone column', category: 'architecture', rarity: 'premium', coins: 120, unlockMinutes: 90, surfaces: F, size: [0.5, 0.5, 5.2], render: 'column', params: { color: '#d8d0c2' }, blurb: 'A full-height column, floor to ceiling.', evaluation: ev('Divides a wall into bays', 'Floor, by the wall', 'Vertical rhythm, shadow between pictures', 'Drag', 'negligible', 'Makes a long wall read as rooms') },
  { id: 'column_carved', name: 'Carved pillar', category: 'architecture', rarity: 'rare', coins: 280, unlockMinutes: 300, surfaces: F, size: [0.6, 0.6, 5.2], render: 'column', params: { color: '#c9b69a', carved: true }, blurb: 'A Hoysala-style pillar with banded carving.', heritage: true, evaluation: ev('Divides the wall, heritage', 'Floor, by the wall', 'Carved bands catch the spotlights', 'Drag', 'low', 'The heritage theme in one object') },
  { id: 'arch_plain', name: 'Archway', category: 'architecture', rarity: 'rare', coins: 220, unlockMinutes: 240, surfaces: W, size: [2.0, 0.3, 3.4], render: 'arch', params: { color: '#e4ddd0' }, blurb: 'A blind arch set into the wall, with an artwork spot inside.', evaluation: ev('Frames one artwork in an arch', 'Wall', 'A recessed arch with its own shadow', 'Drag', 'negligible', 'A focal point per section') },
  { id: 'arch_cusped', name: 'Cusped arch', category: 'architecture', rarity: 'epic', coins: 460, unlockMinutes: 540, surfaces: W, size: [2.2, 0.3, 3.6], render: 'arch', params: { color: '#e9dcc3', cusped: true }, blurb: 'A scalloped Mughal arch in sandstone.', heritage: true, evaluation: ev('Frames one artwork, heritage', 'Wall', 'A cusped silhouette on the wall', 'Drag', 'negligible', 'The most Indian wall there is') },
  { id: 'niche', name: 'Wall niche', category: 'architecture', rarity: 'premium', coins: 110, unlockMinutes: 150, surfaces: W, size: [0.8, 0.3, 1.0], render: 'niche', params: { color: '#cfc5b4' }, blurb: 'A lit recess for a small object.', carries: 'SHELF', evaluation: ev('Holds one small object in the wall', 'Wall', 'A glowing pocket in the wall', 'Drag; carries', 'low', 'Objects without furniture') },
  { id: 'jaali', name: 'Jaali screen', category: 'architecture', rarity: 'rare', coins: 300, unlockMinutes: 360, surfaces: F, size: [1.6, 0.1, 2.4], render: 'jaali', params: { color: '#e7d9bf' }, blurb: 'A pierced stone screen that throws a lattice of light.', heritage: true, evaluation: ev('Divides the floor, patterns the light', 'Floor', 'Lattice shadows across the floor', 'Drag, rotate', 'low', 'Light becomes an object') },
  { id: 'skylight', name: 'Skylight', category: 'architecture', rarity: 'epic', coins: 480, unlockMinutes: 480, surfaces: F, size: [2.0, 2.0, 0.2], render: 'skylight', params: { color: '#eaf3ff' }, blurb: 'A square of sky in the ceiling over a section.', evaluation: ev('Daylight for a whole section', 'Ceiling', 'Cooler, brighter section with a sky patch', 'On/off', 'low', 'Changes a section\'s mood entirely') },
  { id: 'curtain_velvet', name: 'Velvet drape', category: 'architecture', rarity: 'premium', coins: 100, unlockMinutes: 120, surfaces: W, size: [1.2, 0.2, 4.6], render: 'curtain', params: { color: '#5b1d2b' }, blurb: 'A floor-length drape beside a wall bay.', evaluation: ev('Softens a wall edge', 'Wall, at a section edge', 'Deep red folds, a theatre feel', 'Drag', 'negligible', 'Richness per coin') },

  // ---- decoration ------------------------------------------------------------------
  { id: 'rug_dhurrie', name: 'Dhurrie rug', category: 'decoration', rarity: 'basic', coins: 55, unlockMinutes: 0, surfaces: F, size: [2.4, 1.6, 0.02], render: 'rug', params: { color: '#b4573a' }, blurb: 'A flat-woven rug in rust and cream.', heritage: true, evaluation: ev('Warms the floor', 'Floor, centre', 'A patch of colour and pattern underfoot', 'Drag, rotate', 'negligible', 'Cheapest way to furnish a section') },
  { id: 'rug_persian', name: 'Kashmir carpet', category: 'decoration', rarity: 'rare', coins: 240, unlockMinutes: 300, surfaces: F, size: [3.0, 2.0, 0.02], render: 'rug', params: { color: '#6b1f2a', ornate: true }, blurb: 'A hand-knotted carpet with a central medallion.', heritage: true, evaluation: ev('Warms the floor, grand', 'Floor, centre', 'Deep red pattern across the floor', 'Drag, rotate', 'negligible', 'Palace feel') },
  { id: 'vase_blue', name: 'Jaipur blue vase', category: 'decoration', rarity: 'basic', coins: 40, unlockMinutes: 30, surfaces: SMALL, size: [0.3, 0.3, 0.45], render: 'vase', params: { color: '#2f63a8' }, blurb: 'Blue pottery with a white vine.', heritage: true, evaluation: ev('Small object for a surface', 'Pedestal, table or shelf', 'A spot of blue', 'Rotate', 'negligible', 'First object for a pedestal') },
  { id: 'vase_terracotta', name: 'Terracotta urn', category: 'decoration', rarity: 'basic', coins: 35, unlockMinutes: 0, surfaces: SMALL, size: [0.35, 0.35, 0.5], render: 'vase', params: { color: '#a85a37' }, blurb: 'A plain earthen urn.', evaluation: ev('Small object', 'Pedestal, table or shelf', 'Warm earthy form', 'Rotate', 'negligible', 'Cheapest object') },
  { id: 'bust_marble', name: 'Marble bust', category: 'decoration', rarity: 'premium', coins: 150, unlockMinutes: 180, surfaces: SMALL, size: [0.35, 0.3, 0.55], render: 'bust', params: { color: '#efe9df' }, blurb: 'A white marble head on a small base.', evaluation: ev('Small sculpture', 'Pedestal', 'A pale form that takes a spotlight well', 'Rotate', 'negligible', 'Classic museum object') },
  { id: 'mirror_arched', name: 'Arched mirror', category: 'decoration', rarity: 'premium', coins: 130, unlockMinutes: 150, surfaces: W, size: [0.8, 0.1, 1.4], render: 'mirror', params: { color: '#b8923e' }, blurb: 'A brass-framed mirror that doubles the light.', evaluation: ev('Reflects the section', 'Wall', 'A bright reflective panel between pictures', 'Drag', 'low', 'Makes a section feel larger') },
  { id: 'plant_areca', name: 'Areca palm', category: 'decoration', rarity: 'basic', coins: 60, unlockMinutes: 0, surfaces: F, size: [1.0, 1.0, 1.8], render: 'plant', params: { sprite: 'areca_palm' }, blurb: 'A potted palm from the balcony collection.', evaluation: ev('Green accent', 'Floor, corners', 'Soft green against stone', 'Drag', 'low', 'Life in a stone room') },
  { id: 'plant_fern', name: 'Fern', category: 'decoration', rarity: 'basic', coins: 45, unlockMinutes: 30, surfaces: F, size: [0.8, 0.8, 0.8], render: 'plant', params: { sprite: 'fern' }, blurb: 'A potted fern.', evaluation: ev('Green accent, low', 'Floor', 'Soft fronds at floor level', 'Drag', 'low', 'Fills a low corner') },
  { id: 'plant_bamboo', name: 'Bamboo clump', category: 'decoration', rarity: 'premium', coins: 140, unlockMinutes: 240, surfaces: F, size: [1.2, 1.2, 3.0], render: 'plant', params: { sprite: 'bamboo' }, blurb: 'Tall bamboo in a stone trough.', evaluation: ev('Tall green divider', 'Floor', 'A vertical green screen', 'Drag', 'low', 'Divides without walls') },
  { id: 'planter_box', name: 'Stone trough', category: 'decoration', rarity: 'basic', coins: 50, unlockMinutes: 45, surfaces: F, size: [1.4, 0.4, 0.5], render: 'planter_box', params: { color: '#bdb3a2' }, blurb: 'A long trough of flowering plants along the wall.', evaluation: ev('Low planting along a wall', 'Floor, by the wall', 'Colour at the foot of the pictures', 'Drag', 'low', 'Softens the wall base') },
  { id: 'bell_temple', name: 'Temple bell', category: 'decoration', rarity: 'premium', coins: 120, unlockMinutes: 150, surfaces: F, size: [0.5, 0.5, 2.2], render: 'bell', params: { color: '#a3792f' }, blurb: 'A brass bell on a carved stand.', heritage: true, evaluation: ev('Heritage accent', 'Floor', 'A tall brass form', 'Drag, tap to ring', 'negligible', 'A sound and a shape') },
  { id: 'rangoli', name: 'Rangoli', category: 'decoration', rarity: 'basic', coins: 40, unlockMinutes: 0, surfaces: F, size: [1.2, 1.2, 0.01], render: 'rangoli', params: { color: '#e0552e' }, blurb: 'A coloured powder pattern on the floor.', heritage: true, evaluation: ev('Floor pattern', 'Floor, centre or threshold', 'A bright mandala underfoot', 'Drag, rotate', 'negligible', 'Festival welcome') },

  // ---- heritage ----------------------------------------------------------------------
  { id: 'statue_nandi', name: 'Nandi', category: 'heritage', rarity: 'epic', coins: 560, unlockMinutes: 720, surfaces: F, size: [1.4, 0.7, 1.0], render: 'statue', params: { color: '#2d2a2a', kind: 'nandi' }, blurb: 'A black stone Nandi, seated, garlanded.', heritage: true, evaluation: ev('Large sculpture', 'Floor, best on a wide plinth', 'A dark mass that anchors a section', 'Drag, rotate', 'low', 'A true exhibit') },
  { id: 'statue_elephant', name: 'Stone elephant', category: 'heritage', rarity: 'epic', coins: 520, unlockMinutes: 660, surfaces: F, size: [1.3, 0.7, 1.3], render: 'statue', params: { color: '#9a8f82', kind: 'elephant' }, blurb: 'A temple elephant in grey stone.', heritage: true, evaluation: ev('Large sculpture', 'Floor', 'A grey form by an entrance', 'Drag, rotate', 'low', 'Guards a section') },
  { id: 'torana', name: 'Torana gateway', category: 'heritage', rarity: 'legendary', coins: 900, unlockMinutes: 900, surfaces: F, size: [2.6, 0.4, 4.0], render: 'torana', params: { color: '#c9a46a' }, blurb: 'A carved gateway between two sections, after Sanchi.', heritage: true, evaluation: ev('Gateway between sections', 'Floor, at a section edge', 'A carved portal to walk through', 'Drag', 'medium', 'The museum\'s signature') },
  { id: 'scroll_case', name: 'Illuminated scroll', category: 'heritage', rarity: 'rare', coins: 260, unlockMinutes: 420, surfaces: ['DISPLAY_CASE', 'TABLETOP'], size: [0.7, 0.3, 0.1], render: 'scroll', params: { color: '#e9dcb8' }, blurb: 'A painted manuscript scroll, for a vitrine.', heritage: true, evaluation: ev('Small relic for a case', 'Vitrine or table', 'A painted strip under glass', 'Rotate', 'negligible', 'Gives the vitrine a purpose') },
  { id: 'lamp_brass_tall', name: 'Brass deepam', category: 'heritage', rarity: 'premium', coins: 140, unlockMinutes: 180, surfaces: F, size: [0.4, 0.4, 1.5], render: 'floorlamp', params: { color: '#ffc27a', deepam: true }, blurb: 'A tall tiered oil lamp from Kerala.', heritage: true, evaluation: ev('Accent light, heritage', 'Floor', 'Many small flames up a brass column', 'On/off', 'low', 'Light and heritage in one') },
  { id: 'peacock_brass', name: 'Brass peacock', category: 'heritage', rarity: 'rare', coins: 220, unlockMinutes: 300, surfaces: SMALL, size: [0.4, 0.3, 0.5], render: 'statue', params: { color: '#b08a2e', kind: 'peacock' }, blurb: 'A polished brass peacock, tail fanned.', heritage: true, evaluation: ev('Small sculpture', 'Pedestal, table or shelf', 'A bright metallic silhouette', 'Rotate', 'negligible', 'Catches a spotlight') },

  // ---- information -----------------------------------------------------------------
  { id: 'plaque', name: 'Wall plaque', category: 'information', rarity: 'basic', coins: 25, unlockMinutes: 0, surfaces: W, size: [0.3, 0.02, 0.2], render: 'plaque', params: { color: '#f4efe6' }, blurb: 'A small label beside an artwork: title, size and the focus that earned it.', evaluation: ev('Labels an artwork', 'Wall, beside a picture', 'A small text card', 'Drag; tap to read', 'negligible', 'A museum reads with labels') },
  { id: 'sign_section', name: 'Section sign', category: 'information', rarity: 'basic', coins: 40, unlockMinutes: 30, surfaces: W, size: [1.2, 0.03, 0.3], render: 'sign', params: { color: '#1f1b18' }, blurb: 'A large section title on the wall.', evaluation: ev('Names a section', 'Wall, high', 'Bold lettering above the pictures', 'Drag', 'negligible', 'Wayfinding') },
  { id: 'stand_info', name: 'Reading stand', category: 'information', rarity: 'premium', coins: 90, unlockMinutes: 120, surfaces: F, size: [0.5, 0.4, 1.0], render: 'table', params: { color: '#3a3330', lectern: true }, blurb: 'A lectern with the section\'s story.', evaluation: ev('Tells the section\'s story', 'Floor, before a wall', 'A slanted reading surface', 'Drag; tap to read', 'negligible', 'Context for visitors') },

  // ---- security & realism --------------------------------------------------------
  { id: 'camera_dome', name: 'Dome camera', category: 'security', rarity: 'basic', coins: 30, unlockMinutes: 60, surfaces: W, size: [0.15, 0.15, 0.15], render: 'camera', params: { color: '#2b2b2b' }, blurb: 'A small ceiling dome with a red pinprick.', evaluation: ev('Realism', 'Wall, at the ceiling', 'A tiny red blink', 'None', 'negligible', 'The detail that makes it a museum') },
  { id: 'sensor_motion', name: 'Motion sensor', category: 'security', rarity: 'basic', coins: 25, unlockMinutes: 60, surfaces: W, size: [0.1, 0.05, 0.1], render: 'sensor', params: { color: '#e8e8e8' }, blurb: 'A white sensor in the wall corner.', evaluation: ev('Realism', 'Wall, high corner', 'A small white box', 'None', 'negligible', 'Cheap realism') },
  { id: 'extinguisher', name: 'Fire extinguisher', category: 'security', rarity: 'basic', coins: 25, unlockMinutes: 0, surfaces: W, size: [0.2, 0.15, 0.6], render: 'extinguisher', params: { color: '#c62828' }, blurb: 'Red, in a wall bracket.', evaluation: ev('Realism', 'Wall, low', 'A red cylinder at knee height', 'None', 'negligible', 'Honest realism') },

  // ---- premium & legendary ---------------------------------------------------------
  { id: 'fountain', name: 'Marble fountain', category: 'premium', rarity: 'legendary', coins: 1100, unlockMinutes: 1200, surfaces: F, size: [1.8, 1.8, 1.2], render: 'fountain', params: { color: '#efe9e1' }, blurb: 'A lotus fountain with moving water and its reflections.', heritage: true, evaluation: ev('Centrepiece with motion', 'Floor, centre', 'Rippling water and reflected light', 'Drag', 'medium', 'The rarest object') },
  { id: 'spot_gold', name: 'Gold-rim spotlight', category: 'premium', rarity: 'rare', coins: 260, unlockMinutes: 360, surfaces: W, size: [0.3, 0.3, 0.3], render: 'spot', params: { color: '#ffd08a', intensity: 1.5, gold: true }, blurb: 'A brighter, warmer spot with a brass rim.', evaluation: ev('Brightest single-artwork light', 'Ceiling track', 'A strong warm pool with a brass glint', 'On/off, intensity, drag', 'low', 'For the best picture') },
  { id: 'wash_amber', name: 'Amber wall wash', category: 'premium', rarity: 'epic', coins: 420, unlockMinutes: 540, surfaces: W, size: [3, 0.2, 0.2], render: 'wash', params: { color: '#ffc98a', amber: true }, blurb: 'A deep amber cove light for a heritage wall.', heritage: true, evaluation: ev('Lifts a wall, amber', 'Top of the wall', 'A sunset gradient down the wall', 'On/off, intensity', 'low', 'Heritage theme lighting') },
];

export const MUSEUM_STORE_BY_ID: Record<string, MuseumItem> = Object.fromEntries(MUSEUM_STORE.map((i) => [i.id, i]));

export const RARITY_ORDER: Rarity[] = ['basic', 'premium', 'rare', 'epic', 'legendary'];
export const CATEGORY_ORDER: MuseumCategory[] = ['frames', 'lighting', 'exhibition', 'furniture', 'architecture', 'decoration', 'heritage', 'information', 'security', 'premium'];

export function isFrameItem(itemId: string): boolean {
  return MUSEUM_STORE_BY_ID[itemId]?.render === 'frame';
}

export function isLightItem(itemId: string): boolean {
  const r = MUSEUM_STORE_BY_ID[itemId]?.render;
  return r === 'spot' || r === 'wash' || r === 'uplight' || r === 'floorlamp' || r === 'pendant' || r === 'chandelier' || r === 'diya_row' || r === 'skylight';
}

/** Width along the wall of any museum object, artworks included. */
export function museumWidthOf(o: MuseumObject, artworks: (id: string) => ArtworkRecord | null): number {
  if (o.itemId === 'artwork') {
    const a = o.artId ? artworks(o.artId) : null;
    return a ? wallWidthOf({ itemId: 'artwork', scale: o.scale, tier: a.tier, aspect: a.aspect }) : 0.8;
  }
  const it = MUSEUM_STORE_BY_ID[o.itemId];
  return wallWidthOf({ itemId: o.itemId, scale: o.scale, widthM: it?.size[0] ?? 0.8 });
}
