// Data model for the Balcony World (architecture doc, section G). Local-first
// shapes designed to map 1:1 onto API tables when cloud sync is added. No
// React, no three.js here — these are plain records.

export type Vec3 = [number, number, number];

export type PlacementSurface = 'floor' | 'wallLeft' | 'wallRight' | 'railing' | 'ceiling' | 'table';

export type AssetCategory =
  | 'PLANTS'
  | 'FURNITURE'
  | 'LIGHTING'
  | 'DECOR'
  | 'WALL_ART'
  | 'POTS'
  | 'RUGS'
  | 'TABLES'
  | 'CHAIRS'
  | 'FOUNTAINS'
  | 'SPECIAL';

/** A rectangle on a named plane of the environment where objects may go.
 * Floor zones: x spans center.x ± size[0]/2, z spans center.z ± size[1]/2.
 * Wall zones: z spans center.z ± size[0]/2, y spans center.y ± size[1]/2. */
export interface PlacementZone {
  id: string;
  surface: PlacementSurface;
  center: Vec3;
  size: [number, number];
  maxObjects: number;
}

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  /** 'procedural' builds a stand-in from code; 'glb' loads a real model. */
  kind: 'procedural' | 'glb';
  /** Builder key (procedural) or bundled/remote uri (glb). */
  ref: string;
  placementType: PlacementSurface;
  /** Width, depth, height in metres — drives collision, shadows and scale. */
  footprint: Vec3;
  scaleLimits: [number, number];
  rotationAllowed: boolean;
  /** True until a final art asset replaces the stand-in (section K). */
  placeholder: boolean;
}

export interface UserPlacedObject {
  id: string;
  assetId: string;
  position: Vec3;
  rotation: Vec3; // radians, [x, y, z]
  scale: number;
  placementSurface: PlacementSurface;
  zoneId: string;
  createdAt: number;
  updatedAt: number;
}

export interface CameraState {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
}

export interface AudioSettings {
  enabled: boolean;
  master: number; // 0..1
}

/** Which side of the balcony carries each architectural feature of the
 * procedural shell. Omitted = 'none'. */
export interface ShellFeatures {
  /** Floor-to-ceiling sliding glass doors on this side wall. */
  glassDoors?: 'left' | 'right' | 'none';
  /** A planted living-wall panel on this side wall. */
  greenWall?: 'left' | 'right' | 'none';
  /** Recessed downlights in the overhang. */
  downlights?: number;
}

export interface ShellParams {
  width: number;
  balconyDepth: number;
  roomDepth: number;
  height: number;
  features?: ShellFeatures;
}

export interface EnvironmentDefinition {
  id: string;
  name: string;
  price: { coins: number };
  shell: { kind: 'procedural'; params: ShellParams };
  sky: { topColor: string; horizonColor: string; sunColor: string; sunAzimuth: number; sunElevation: number };
  lighting: { sunIntensity: number; sunColor: string; ambient: number; hemisphereSky: string; hemisphereGround: string };
  fog: { color: string; near: number; far: number };
  zones: PlacementZone[];
  defaultObjects: { assetId: string; position: Vec3; rotationY?: number }[];
  audio: { layer: string; clip: string; gain: number }[];
  camera: { target: Vec3; default: { yaw: number; pitch: number; distance: number }; zoom: [number, number] };
  limits: { maxObjects: number };
}

/** User-selectable living-balcony environment (FocusEnvironmentEngine). */
export type EnvironmentPresetId = 'AUTO' | 'MORNING' | 'GOLDEN_HOUR' | 'NIGHT' | 'RAIN' | 'FOREST' | 'MONSOON' | 'WINTER';

export interface WorldSaveState {
  schemaVersion: number;
  environmentId: string;
  placedObjects: UserPlacedObject[];
  camera: CameraState | null;
  audio: AudioSettings;
  /** Missing in saves written before the environment engine → AUTO. */
  environmentPreset?: EnvironmentPresetId;
}
