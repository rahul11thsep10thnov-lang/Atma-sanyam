// FocusEnvironmentEngine — the living-balcony system (docs/FOCUS_ENVIRONMENT_ENGINE.md).
//
// One pure, framework-free engine owns *when* the balcony looks like what:
// the time of day (the sun physically moves), the weather, passing clouds,
// and the focus session's arc — the calm of DEEP_FOCUS and the "sunlight
// reward" when a session completes. It emits one LightingFrame per tick;
// renderers (the three.js LightingRig, the audio mixer, a future 2.5D scene)
// only ever read frames, so every plant, balcony and environment inherits
// the same behaviour without re-authoring effects per screen.
//
// No React, no three.js, no timers of its own: callers pass the clock in.

export type TimeOfDayState = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'GOLDEN_HOUR' | 'SUNSET' | 'NIGHT';
export type WeatherState = 'CLEAR' | 'CLOUDY' | 'LIGHT_RAIN' | 'HEAVY_RAIN' | 'MIST' | 'WINDY';
export type FocusState = 'IDLE' | 'FOCUS_START' | 'DEEP_FOCUS' | 'FOCUS_COMPLETE' | 'FOCUS_INTERRUPTED' | 'PLANT_GROWTH';
/** User-selectable environments (brief §17). AUTO follows the device clock. */
export type EnvironmentPreset = 'AUTO' | 'MORNING' | 'GOLDEN_HOUR' | 'NIGHT' | 'RAIN' | 'FOREST' | 'MONSOON' | 'WINTER';

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = ['AUTO', 'MORNING', 'GOLDEN_HOUR', 'NIGHT', 'RAIN', 'FOREST', 'MONSOON', 'WINTER'];

export type RGB = [number, number, number];

export type AudioLayerId = 'birds' | 'wind' | 'water' | 'city' | 'insects' | 'rain' | 'thunder' | 'music';

/** Everything a renderer needs for one frame. All scalars are 0..1 unless noted. */
export interface LightingFrame {
  timeOfDay: TimeOfDayState;
  weather: WeatherState;
  focus: FocusState;
  preset: EnvironmentPreset;
  /** Fractional local hour 0..24 the frame was computed for. */
  hour: number;
  sun: {
    /** Degrees. 0 = straight ahead over the railing, 90 = right, −90 = left. */
    azimuth: number;
    /** Degrees above the horizon; negative = below (night). */
    elevation: number;
    /** Directional light intensity, 0 at night. */
    intensity: number;
    color: RGB;
    /** 0 = hard noon shadows, 1 = very long low-sun shadows. */
    shadowLength: number;
    /** 0 = crisp, 1 = fully diffuse (overcast). */
    shadowSoftness: number;
  };
  moon: { intensity: number; color: RGB };
  ambient: { intensity: number; skyColor: RGB; groundColor: RGB };
  sky: { top: RGB; horizon: RGB; sunGlow: RGB; stars: number };
  fog: { color: RGB; density: number };
  /** The signature pool of light at the plant's base. */
  pool: { intensity: number; radius: number; elongation: number; color: RGB };
  /** The volumetric shaft from above. `travel` is the reward-time sweep toward the plant (0..1). */
  beam: { intensity: number; haze: number; travel: number };
  particles: { dust: number; fireflies: number; rain: number; mist: number };
  /** Wind amplitude for foliage (brief §13: calm 1–2%, normal 2–5%, windy 5–10%) and its speed. */
  plantMotion: { wind: number; speed: number };
  /** Multiplier on everything that is not the plant — the deep-focus hush. */
  backgroundBrightness: number;
  lamps: { intensity: number; color: RGB };
  /** Wet-floor reflectivity after rain. */
  wetness: number;
  audio: Record<AudioLayerId, number>;
  /** Almost imperceptible camera push-in during the reward (0..1 → ~3%). */
  camera: { pushIn: number };
  /** Reward/interruption sequence progress 0..1 while FOCUS_COMPLETE / FOCUS_INTERRUPTED / PLANT_GROWTH. */
  sequence: { progress: number; growthPulse: number };
  /** Wildlife activity — birds visible/audible by day, fewer during focus. */
  birdActivity: number;
}

export type FocusEvent =
  | { type: 'FOCUS_START' }
  | { type: 'FOCUS_COMPLETE'; minutes: number; plantGrew?: boolean }
  | { type: 'FOCUS_INTERRUPTED' }
  | { type: 'FOCUS_END' };

type Keyframe = Omit<LightingFrame, 'timeOfDay' | 'weather' | 'focus' | 'preset' | 'hour' | 'sequence' | 'camera'>;

// --- maths ------------------------------------------------------------------

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export function rgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function scaleRGB(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

function lerpAudio(a: Record<AudioLayerId, number>, b: Record<AudioLayerId, number>, t: number) {
  const out = { ...a };
  for (const key of Object.keys(out) as AudioLayerId[]) out[key] = lerp(a[key], b[key], t);
  return out;
}

function lerpKeyframe(a: Keyframe, b: Keyframe, t: number): Keyframe {
  return {
    sun: {
      azimuth: lerp(a.sun.azimuth, b.sun.azimuth, t),
      elevation: lerp(a.sun.elevation, b.sun.elevation, t),
      intensity: lerp(a.sun.intensity, b.sun.intensity, t),
      color: lerpRGB(a.sun.color, b.sun.color, t),
      shadowLength: lerp(a.sun.shadowLength, b.sun.shadowLength, t),
      shadowSoftness: lerp(a.sun.shadowSoftness, b.sun.shadowSoftness, t),
    },
    moon: { intensity: lerp(a.moon.intensity, b.moon.intensity, t), color: lerpRGB(a.moon.color, b.moon.color, t) },
    ambient: {
      intensity: lerp(a.ambient.intensity, b.ambient.intensity, t),
      skyColor: lerpRGB(a.ambient.skyColor, b.ambient.skyColor, t),
      groundColor: lerpRGB(a.ambient.groundColor, b.ambient.groundColor, t),
    },
    sky: {
      top: lerpRGB(a.sky.top, b.sky.top, t),
      horizon: lerpRGB(a.sky.horizon, b.sky.horizon, t),
      sunGlow: lerpRGB(a.sky.sunGlow, b.sky.sunGlow, t),
      stars: lerp(a.sky.stars, b.sky.stars, t),
    },
    fog: { color: lerpRGB(a.fog.color, b.fog.color, t), density: lerp(a.fog.density, b.fog.density, t) },
    pool: {
      intensity: lerp(a.pool.intensity, b.pool.intensity, t),
      radius: lerp(a.pool.radius, b.pool.radius, t),
      elongation: lerp(a.pool.elongation, b.pool.elongation, t),
      color: lerpRGB(a.pool.color, b.pool.color, t),
    },
    beam: { intensity: lerp(a.beam.intensity, b.beam.intensity, t), haze: lerp(a.beam.haze, b.beam.haze, t), travel: lerp(a.beam.travel, b.beam.travel, t) },
    particles: {
      dust: lerp(a.particles.dust, b.particles.dust, t),
      fireflies: lerp(a.particles.fireflies, b.particles.fireflies, t),
      rain: lerp(a.particles.rain, b.particles.rain, t),
      mist: lerp(a.particles.mist, b.particles.mist, t),
    },
    plantMotion: { wind: lerp(a.plantMotion.wind, b.plantMotion.wind, t), speed: lerp(a.plantMotion.speed, b.plantMotion.speed, t) },
    backgroundBrightness: lerp(a.backgroundBrightness, b.backgroundBrightness, t),
    lamps: { intensity: lerp(a.lamps.intensity, b.lamps.intensity, t), color: lerpRGB(a.lamps.color, b.lamps.color, t) },
    wetness: lerp(a.wetness, b.wetness, t),
    audio: lerpAudio(a.audio, b.audio, t),
    birdActivity: lerp(a.birdActivity, b.birdActivity, t),
  };
}

// --- the day (brief §2–§4) ----------------------------------------------------

/** [state, startHour] in order around the clock; each runs until the next. */
export const TIME_OF_DAY_SCHEDULE: [TimeOfDayState, number][] = [
  ['DAWN', 5],
  ['MORNING', 7],
  ['AFTERNOON', 11],
  ['GOLDEN_HOUR', 16],
  ['SUNSET', 18.5],
  ['NIGHT', 19.5],
];

/** Minutes of clock over which one state cross-fades into the next (§2 "several minutes"). */
const TRANSITION_MINUTES = 24;

export function timeOfDayForHour(hour: number): TimeOfDayState {
  let state: TimeOfDayState = 'NIGHT';
  for (const [s, start] of TIME_OF_DAY_SCHEDULE) if (hour >= start) state = s;
  return state;
}

const SUN_WHITE = rgb('#fff4df');
const SUN_GOLD = rgb('#ffd9a3');
const SUN_AMBER = rgb('#ffb978');
const POOL_GOLD = rgb('#ffe6b8');
const LAMP = rgb('#ffc46a');
const MOON = rgb('#cfd9ff');

const NO_AUDIO: Record<AudioLayerId, number> = { birds: 0, wind: 0, water: 0, city: 0, insects: 0, rain: 0, thunder: 0, music: 0 };

function key(partial: {
  sunAz: number;
  sunEl: number;
  sunI: number;
  sunC: RGB;
  shadowLen: number;
  moon?: number;
  ambI: number;
  ambSky: string;
  ambGround: string;
  skyTop: string;
  skyHor: string;
  glow: string;
  stars?: number;
  fog: string;
  fogD: number;
  pool: number;
  poolR: number;
  poolE: number;
  beam: number;
  haze: number;
  dust: number;
  fireflies?: number;
  wind: number;
  bg: number;
  lamps?: number;
  audio: Partial<Record<AudioLayerId, number>>;
  birds: number;
}): Keyframe {
  return {
    sun: { azimuth: partial.sunAz, elevation: partial.sunEl, intensity: partial.sunI, color: partial.sunC, shadowLength: partial.shadowLen, shadowSoftness: 0.15 },
    moon: { intensity: partial.moon ?? 0, color: MOON },
    ambient: { intensity: partial.ambI, skyColor: rgb(partial.ambSky), groundColor: rgb(partial.ambGround) },
    sky: { top: rgb(partial.skyTop), horizon: rgb(partial.skyHor), sunGlow: rgb(partial.glow), stars: partial.stars ?? 0 },
    fog: { color: rgb(partial.fog), density: partial.fogD },
    pool: { intensity: partial.pool, radius: partial.poolR, elongation: partial.poolE, color: POOL_GOLD },
    beam: { intensity: partial.beam, haze: partial.haze, travel: 1 },
    particles: { dust: partial.dust, fireflies: partial.fireflies ?? 0, rain: 0, mist: 0 },
    plantMotion: { wind: partial.wind, speed: 1 },
    backgroundBrightness: partial.bg,
    lamps: { intensity: partial.lamps ?? 0, color: LAMP },
    wetness: 0,
    audio: { ...NO_AUDIO, ...partial.audio },
    birdActivity: partial.birds,
  };
}

/** Signature look of each state (§2). Sun azimuth sweeps left→right across
 * the day so shadows visibly turn; elevation rises to noon and falls. */
export const TIME_OF_DAY_KEYFRAMES: Record<TimeOfDayState, Keyframe> = {
  DAWN: key({
    sunAz: -62, sunEl: 6, sunI: 0.75, sunC: rgb('#ffe3c4'), shadowLen: 0.95,
    ambI: 0.34, ambSky: '#dfe7f0', ambGround: '#5d5a52',
    skyTop: '#7f93b4', skyHor: '#f3cdb0', glow: '#ffe1c0',
    fog: '#e6d6cc', fogD: 0.55,
    pool: 0.45, poolR: 1.35, poolE: 1.5, beam: 0.45, haze: 0.6, dust: 0.25,
    wind: 0.3, bg: 0.9, audio: { birds: 0.75, wind: 0.3 }, birds: 0.6,
  }),
  MORNING: key({
    sunAz: -38, sunEl: 32, sunI: 1.75, sunC: SUN_GOLD, shadowLen: 0.6,
    ambI: 0.4, ambSky: '#e6ecf5', ambGround: '#6b6256',
    skyTop: '#6f8fc4', skyHor: '#f5dcc0', glow: '#fff0cc',
    fog: '#ead9c6', fogD: 0.3,
    pool: 0.85, poolR: 1.15, poolE: 1.35, beam: 0.8, haze: 0.4, dust: 0.45,
    wind: 0.45, bg: 1, audio: { birds: 0.7, wind: 0.35, city: 0.15 }, birds: 1,
  }),
  AFTERNOON: key({
    sunAz: 8, sunEl: 62, sunI: 2.1, sunC: SUN_WHITE, shadowLen: 0.25,
    ambI: 0.46, ambSky: '#edf2f8', ambGround: '#756b5e',
    skyTop: '#5f86c8', skyHor: '#e9e1d2', glow: '#fff8e6',
    fog: '#e9e3d6', fogD: 0.18,
    pool: 0.65, poolR: 0.85, poolE: 1.1, beam: 0.55, haze: 0.25, dust: 0.3,
    wind: 0.5, bg: 1, audio: { birds: 0.35, wind: 0.45, city: 0.2 }, birds: 0.6,
  }),
  GOLDEN_HOUR: key({
    sunAz: 44, sunEl: 12, sunI: 1.6, sunC: SUN_AMBER, shadowLen: 0.9,
    ambI: 0.36, ambSky: '#e8d9cf', ambGround: '#5f4f44',
    skyTop: '#6b7fa8', skyHor: '#f2b47f', glow: '#ffd3a0',
    fog: '#e9b48e', fogD: 0.45,
    pool: 1, poolR: 1.5, poolE: 1.7, beam: 1, haze: 0.65, dust: 0.6,
    wind: 0.4, bg: 0.95, lamps: 0.15, audio: { birds: 0.6, wind: 0.3, city: 0.25 }, birds: 0.9,
  }),
  SUNSET: key({
    sunAz: 58, sunEl: 2, sunI: 0.8, sunC: rgb('#ff9d6a'), shadowLen: 1,
    ambI: 0.3, ambSky: '#c9b2c8', ambGround: '#4a3d44',
    skyTop: '#55507e', skyHor: '#e8886f', glow: '#ffb27a',
    fog: '#c98c8c', fogD: 0.5,
    pool: 0.55, poolR: 1.6, poolE: 1.9, beam: 0.5, haze: 0.6, dust: 0.35,
    wind: 0.35, bg: 0.85, lamps: 0.55, stars: 0.15, audio: { birds: 0.4, wind: 0.3, city: 0.3, insects: 0.2 }, birds: 0.5,
  }),
  NIGHT: key({
    sunAz: 70, sunEl: -12, sunI: 0, sunC: SUN_AMBER, shadowLen: 0.6,
    moon: 0.35, ambI: 0.2, ambSky: '#2b3658', ambGround: '#1a1c24',
    skyTop: '#121a36', skyHor: '#2b3352', glow: '#8d9ac8', stars: 1,
    fog: '#1e2538', fogD: 0.4,
    pool: 0.3, poolR: 1.1, poolE: 1.2, beam: 0.08, haze: 0.3, dust: 0.1, fireflies: 0.6,
    wind: 0.25, bg: 0.6, lamps: 1, audio: { insects: 0.7, wind: 0.25, city: 0.2 }, birds: 0,
  }),
};

// --- weather (brief §6–§7) ---------------------------------------------------------

interface WeatherModifier {
  cloudCover: number;
  /** Amplitude of passing-cloud dimming: 0 = none, 1 = sun fully blotted at times. */
  cloudPassing: number;
  rain: number;
  mist: number;
  windBoost: number;
  wetness: number;
  audio: Partial<Record<AudioLayerId, number>>;
}

export const WEATHER_MODIFIERS: Record<WeatherState, WeatherModifier> = {
  CLEAR: { cloudCover: 0.05, cloudPassing: 0.25, rain: 0, mist: 0, windBoost: 0, wetness: 0, audio: {} },
  CLOUDY: { cloudCover: 0.6, cloudPassing: 0.5, rain: 0, mist: 0.1, windBoost: 0.15, wetness: 0, audio: {} },
  LIGHT_RAIN: { cloudCover: 0.8, cloudPassing: 0.3, rain: 0.35, mist: 0.25, windBoost: 0.2, wetness: 0.7, audio: { rain: 0.5, water: 0.2 } },
  HEAVY_RAIN: { cloudCover: 0.95, cloudPassing: 0.2, rain: 1, mist: 0.35, windBoost: 0.45, wetness: 1, audio: { rain: 0.9, thunder: 0.35, water: 0.3 } },
  MIST: { cloudCover: 0.5, cloudPassing: 0.2, rain: 0, mist: 1, windBoost: -0.2, wetness: 0.3, audio: {} },
  WINDY: { cloudCover: 0.25, cloudPassing: 0.6, rain: 0, mist: 0, windBoost: 0.8, wetness: 0, audio: { wind: 0.4 } },
};

/** Smooth 0..1 "cloud is passing" signal: a sum of slow incommensurate
 * waves, so the sun dims 100 → ~50 → 100 % over a few minutes, never flashes
 * and never repeats obviously. `t` in seconds. */
export function cloudSignal(t: number): number {
  const s = 0.5 + 0.5 * Math.sin(t / 97) * 0.6 + 0.5 * Math.sin(t / 41 + 1.7) * 0.3 + 0.5 * Math.sin(t / 233 + 0.4) * 0.1;
  return clamp01(s);
}

// --- presets (brief §17) -------------------------------------------------------------

interface PresetConfig {
  /** Fixed hour, or null to follow the clock. */
  hour: number | null;
  weather: WeatherState | null;
  /** Optional colour/atmosphere tweak applied after the time-of-day blend. */
  tint?: (k: Keyframe) => Keyframe;
}

const PRESETS: Record<EnvironmentPreset, PresetConfig> = {
  AUTO: { hour: null, weather: null },
  MORNING: { hour: 8.5, weather: 'CLEAR' },
  GOLDEN_HOUR: { hour: 17.2, weather: 'CLEAR' },
  NIGHT: { hour: 22, weather: 'CLEAR' },
  RAIN: { hour: null, weather: 'LIGHT_RAIN' },
  FOREST: {
    hour: 10,
    weather: 'CLEAR',
    tint: (k) => ({
      ...k,
      ambient: { ...k.ambient, skyColor: rgb('#cfe3c7'), groundColor: rgb('#3f4a33') },
      sky: { ...k.sky, top: rgb('#4e7a62'), horizon: rgb('#bfd8a6') },
      fog: { color: rgb('#c6d9b4'), density: Math.max(k.fog.density, 0.55) },
      beam: { ...k.beam, intensity: Math.max(k.beam.intensity, 0.9), haze: 0.75 },
      particles: { ...k.particles, dust: Math.max(k.particles.dust, 0.6) },
      audio: { ...k.audio, birds: 0.9, insects: 0.35, city: 0 },
    }),
  },
  MONSOON: {
    hour: 15,
    weather: 'HEAVY_RAIN',
    tint: (k) => ({
      ...k,
      sky: { ...k.sky, top: rgb('#5a6775'), horizon: rgb('#9fa8ad') },
      ambient: { ...k.ambient, skyColor: rgb('#c9d2d6') },
      pool: { ...k.pool, intensity: k.pool.intensity * 0.6, color: rgb('#ffe9cf') },
      audio: { ...k.audio, birds: 0.2 },
    }),
  },
  WINTER: {
    hour: 7.5,
    weather: 'MIST',
    tint: (k) => ({
      ...k,
      sun: { ...k.sun, color: rgb('#fff1e0'), intensity: k.sun.intensity * 0.8 },
      ambient: { ...k.ambient, skyColor: rgb('#e4ecf4'), groundColor: rgb('#6b6f72') },
      sky: { ...k.sky, top: rgb('#9fb3cc'), horizon: rgb('#eee6dc') },
      fog: { color: rgb('#e8ecef'), density: Math.max(k.fog.density, 0.7) },
      plantMotion: { ...k.plantMotion, wind: k.plantMotion.wind * 0.6 },
      audio: { ...k.audio, birds: 0.35, insects: 0 },
    }),
  },
};

// --- focus sequences (brief §8–§11, §22) ---------------------------------------------

export const FOCUS_START_SECONDS = 3;
/** The sunlight reward: 5 s, no confetti. */
export const FOCUS_COMPLETE_SECONDS = 5.2;
export const FOCUS_INTERRUPTED_SECONDS = 3;
export const PLANT_GROWTH_SECONDS = 2.2;

/** DEEP_FOCUS: the balcony goes quiet so nothing competes with the plant. */
function applyDeepFocus(k: Keyframe, amount: number): Keyframe {
  const a = smooth(amount);
  return {
    ...k,
    particles: { ...k.particles, dust: k.particles.dust * lerp(1, 0.35, a), fireflies: k.particles.fireflies * lerp(1, 0.4, a) },
    plantMotion: { wind: k.plantMotion.wind * lerp(1, 0.55, a), speed: k.plantMotion.speed * lerp(1, 0.7, a) },
    backgroundBrightness: k.backgroundBrightness * lerp(1, 0.82, a),
    pool: { ...k.pool, intensity: Math.min(1.2, k.pool.intensity + 0.18 * a), radius: k.pool.radius * lerp(1, 0.9, a) },
    beam: { ...k.beam, intensity: Math.min(1.2, k.beam.intensity + 0.12 * a) },
    birdActivity: k.birdActivity * lerp(1, 0.25, a),
    audio: { ...k.audio, birds: k.audio.birds * lerp(1, 0.4, a), city: k.audio.city * lerp(1, 0.5, a), music: k.audio.music * lerp(1, 0.5, a) },
  };
}

/** The reward timeline (§9): darken → a ray appears → it travels to the
 * plant → the plant glows in a pool of light with dust in the beam → growth
 * pulse → the balcony returns. `p` is 0..1 over FOCUS_COMPLETE_SECONDS. */
function applyReward(k: Keyframe, p: number): { frame: Keyframe; pushIn: number; growthPulse: number } {
  const darken = smooth(p / 0.16) * (1 - smooth((p - 0.8) / 0.2)); // settles back at the end
  const rayAppear = smooth((p - 0.12) / 0.3);
  const travel = smooth((p - 0.2) / 0.35);
  const glow = smooth((p - 0.42) / 0.22) * (1 - smooth((p - 0.86) / 0.14));
  const growthPulse = Math.sin(clamp01((p - 0.62) / 0.22) * Math.PI);
  const pushIn = Math.sin(clamp01((p - 0.3) / 0.6) * Math.PI);
  return {
    frame: {
      ...k,
      backgroundBrightness: k.backgroundBrightness * lerp(1, 0.68, darken),
      sun: { ...k.sun, intensity: k.sun.intensity * lerp(1, 0.75, darken) * lerp(1, 1.12, glow) },
      beam: { intensity: Math.max(k.beam.intensity * (1 - darken * 0.6), rayAppear * 1.2), haze: Math.max(k.beam.haze, 0.5 * rayAppear), travel },
      pool: { ...k.pool, intensity: lerp(k.pool.intensity * (1 - darken * 0.5), 1.3, glow), radius: k.pool.radius * lerp(1, 1.25, glow) },
      particles: { ...k.particles, dust: Math.max(k.particles.dust * (1 - darken), glow * 1) },
      plantMotion: { wind: k.plantMotion.wind * lerp(1, 0.5, darken) + growthPulse * 0.35, speed: k.plantMotion.speed },
      audio: { ...k.audio, birds: k.audio.birds * (1 - darken * 0.7), city: k.audio.city * (1 - darken * 0.7) },
      birdActivity: k.birdActivity * (1 - darken * 0.8),
    },
    pushIn,
    growthPulse,
  };
}

/** A broken session (§11): the sunlight gently fades and movement slows; nothing goes dark, nothing shames. */
function applyInterrupted(k: Keyframe, p: number): Keyframe {
  const dip = Math.sin(clamp01(p) * Math.PI);
  return {
    ...k,
    sun: { ...k.sun, intensity: k.sun.intensity * lerp(1, 0.7, dip) },
    pool: { ...k.pool, intensity: k.pool.intensity * lerp(1, 0.55, dip) },
    beam: { ...k.beam, intensity: k.beam.intensity * lerp(1, 0.5, dip) },
    plantMotion: { wind: k.plantMotion.wind * lerp(1, 0.4, dip), speed: k.plantMotion.speed * lerp(1, 0.6, dip) },
    particles: { ...k.particles, dust: k.particles.dust * lerp(1, 0.4, dip) },
  };
}

// --- the engine -----------------------------------------------------------------

export interface FocusEnvironmentOptions {
  preset?: EnvironmentPreset;
  weather?: WeatherState;
  reducedMotion?: boolean;
  /** Seconds for ordinary cross-fades (preset switch, weather change). */
  easeSeconds?: number;
}

export class FocusEnvironmentEngine {
  private preset: EnvironmentPreset;
  private weather: WeatherState;
  private reducedMotion: boolean;
  private easeSeconds: number;
  private focus: FocusState = 'IDLE';
  private focusSince = 0;
  private pendingGrowth = false;
  private current: Keyframe | null = null;
  private lastTick = 0;
  private listeners = new Set<(frame: LightingFrame) => void>();
  private frame: LightingFrame | null = null;

  constructor(options: FocusEnvironmentOptions = {}) {
    this.preset = options.preset ?? 'AUTO';
    this.weather = options.weather ?? 'CLEAR';
    this.reducedMotion = options.reducedMotion ?? false;
    this.easeSeconds = options.easeSeconds ?? 2.5;
  }

  // -- inputs --------------------------------------------------------------

  setPreset(preset: EnvironmentPreset) {
    this.preset = preset;
  }

  getPreset() {
    return this.preset;
  }

  /** Weather used while the preset is AUTO or RAIN-less; presets with their own weather win. */
  setWeather(weather: WeatherState) {
    this.weather = weather;
  }

  setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
  }

  getFocusState() {
    return this.focus;
  }

  dispatch(event: FocusEvent, nowSeconds: number) {
    switch (event.type) {
      case 'FOCUS_START':
        this.focus = 'FOCUS_START';
        break;
      case 'FOCUS_COMPLETE':
        this.focus = 'FOCUS_COMPLETE';
        this.pendingGrowth = Boolean(event.plantGrew);
        break;
      case 'FOCUS_INTERRUPTED':
        this.focus = 'FOCUS_INTERRUPTED';
        break;
      case 'FOCUS_END':
        this.focus = 'IDLE';
        break;
    }
    this.focusSince = nowSeconds;
  }

  subscribe(listener: (frame: LightingFrame) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  lastFrame() {
    return this.frame;
  }

  // -- the tick --------------------------------------------------------------

  /**
   * @param nowSeconds monotonic seconds (animation clock)
   * @param clockHour  local wall-clock hour 0..24 (fractional); device time in AUTO
   */
  tick(nowSeconds: number, clockHour: number): LightingFrame {
    const dt = this.lastTick ? Math.min(0.5, nowSeconds - this.lastTick) : 0;
    this.lastTick = nowSeconds;

    // 1. advance timed focus sequences
    const elapsed = nowSeconds - this.focusSince;
    if (this.focus === 'FOCUS_START' && elapsed >= FOCUS_START_SECONDS) this.focus = 'DEEP_FOCUS';
    if (this.focus === 'FOCUS_COMPLETE' && elapsed >= FOCUS_COMPLETE_SECONDS) {
      if (this.pendingGrowth) {
        this.focus = 'PLANT_GROWTH';
        this.pendingGrowth = false;
        this.focusSince = nowSeconds;
      } else this.focus = 'IDLE';
    }
    if (this.focus === 'PLANT_GROWTH' && nowSeconds - this.focusSince >= PLANT_GROWTH_SECONDS) this.focus = 'IDLE';
    if (this.focus === 'FOCUS_INTERRUPTED' && elapsed >= FOCUS_INTERRUPTED_SECONDS) this.focus = 'IDLE';

    // 2. time of day — continuous blend between adjacent states
    const presetCfg = PRESETS[this.preset];
    const hour = ((presetCfg.hour ?? clockHour) % 24 + 24) % 24;
    const weather = presetCfg.weather ?? this.weather;
    let target = this.blendDay(hour);
    if (presetCfg.tint) target = presetCfg.tint(target);

    // 3. weather + passing clouds
    target = this.applyWeather(target, weather, nowSeconds);

    // 4. focus overlay
    let pushIn = 0;
    let growthPulse = 0;
    let progress = 0;
    const seq = nowSeconds - this.focusSince;
    if (this.focus === 'FOCUS_START') {
      progress = clamp01(seq / FOCUS_START_SECONDS);
      target = applyDeepFocus(target, progress);
    } else if (this.focus === 'DEEP_FOCUS') {
      target = applyDeepFocus(target, 1);
    } else if (this.focus === 'FOCUS_COMPLETE') {
      progress = clamp01(seq / FOCUS_COMPLETE_SECONDS);
      const r = applyReward(target, progress);
      target = r.frame;
      pushIn = this.reducedMotion ? 0 : r.pushIn;
      growthPulse = r.growthPulse;
    } else if (this.focus === 'PLANT_GROWTH') {
      progress = clamp01(seq / PLANT_GROWTH_SECONDS);
      growthPulse = Math.sin(progress * Math.PI);
      target = { ...target, pool: { ...target.pool, intensity: target.pool.intensity + 0.25 * growthPulse } };
    } else if (this.focus === 'FOCUS_INTERRUPTED') {
      progress = clamp01(seq / FOCUS_INTERRUPTED_SECONDS);
      target = applyInterrupted(target, progress);
    }

    // 5. reduced motion (§19): no drifting light, no particles, no push-in, calmer plants
    if (this.reducedMotion) {
      target = {
        ...target,
        particles: { dust: 0, fireflies: 0, rain: target.particles.rain, mist: target.particles.mist },
        plantMotion: { wind: target.plantMotion.wind * 0.35, speed: target.plantMotion.speed * 0.6 },
      };
    }

    // 6. ease toward the target so preset/weather/focus switches never pop.
    //    Reward and interruption are authored timelines — they drive directly.
    const direct = this.focus === 'FOCUS_COMPLETE' || this.focus === 'FOCUS_INTERRUPTED' || this.focus === 'PLANT_GROWTH';
    const ease = this.reducedMotion ? 0.4 : this.easeSeconds;
    if (!this.current || direct || dt === 0) this.current = target;
    else this.current = lerpKeyframe(this.current, target, 1 - Math.exp(-dt / ease));

    this.frame = {
      ...this.current,
      timeOfDay: timeOfDayForHour(hour),
      weather,
      focus: this.focus,
      preset: this.preset,
      hour,
      camera: { pushIn },
      sequence: { progress, growthPulse },
    };
    for (const l of this.listeners) l(this.frame);
    return this.frame;
  }

  // -- internals ---------------------------------------------------------------

  private blendDay(clockHour: number): Keyframe {
    const schedule = TIME_OF_DAY_SCHEDULE;
    const window = TRANSITION_MINUTES / 60;
    // find the current state and the next boundary
    let idx = schedule.length - 1;
    for (let i = 0; i < schedule.length; i++) if (clockHour >= schedule[i][1]) idx = i;
    const [state, start] = schedule[idx];
    // NIGHT wraps past midnight: measure 0:00–5:00 as 24:00–29:00 so it sits after its own start
    const hour = clockHour < start ? clockHour + 24 : clockHour;
    const nextIdx = (idx + 1) % schedule.length;
    const nextStart = schedule[nextIdx][1] + (nextIdx === 0 ? 24 : 0);
    const prevIdx = (idx - 1 + schedule.length) % schedule.length;
    let frame = TIME_OF_DAY_KEYFRAMES[state];
    // cross-fade across each boundary, half a window on either side
    if (nextStart - hour < window / 2) {
      const t = smooth(0.5 + (hour - nextStart) / window);
      frame = lerpKeyframe(frame, TIME_OF_DAY_KEYFRAMES[schedule[nextIdx][0]], t);
    } else if (hour - start < window / 2) {
      const t = smooth(0.5 - (hour - start) / window);
      frame = lerpKeyframe(frame, TIME_OF_DAY_KEYFRAMES[schedule[prevIdx][0]], t);
    }
    // the sun physically moves within a state too (§3): nudge toward the
    // next keyframe's angles proportionally to progress through the state
    const span = nextStart - start;
    const p = clamp01((hour - start) / span);
    const next = TIME_OF_DAY_KEYFRAMES[schedule[nextIdx][0]];
    const az = lerp(TIME_OF_DAY_KEYFRAMES[state].sun.azimuth, next.sun.azimuth, p * 0.5);
    const el = lerp(TIME_OF_DAY_KEYFRAMES[state].sun.elevation, next.sun.elevation, p * 0.5);
    return { ...frame, sun: { ...frame.sun, azimuth: az, elevation: el, shadowLength: clamp01(1 - el / 70) } };
  }

  private applyWeather(k: Keyframe, weather: WeatherState, nowSeconds: number): Keyframe {
    const w = WEATHER_MODIFIERS[weather];
    const cloud = this.reducedMotion ? 0.5 : cloudSignal(nowSeconds);
    // sun through cover: 100 → ~50 → 100 % as clouds pass (§7)
    const sunFactor = (1 - w.cloudCover * 0.7) * (1 - w.cloudPassing * 0.5 * cloud);
    const soft = clamp01(k.sun.shadowSoftness + w.cloudCover * 0.8 + w.mist * 0.5);
    const wind = clamp01(k.plantMotion.wind + w.windBoost * 0.5);
    return {
      ...k,
      sun: { ...k.sun, intensity: k.sun.intensity * sunFactor, shadowSoftness: soft, color: lerpRGB(k.sun.color, rgb('#f3f1ec'), w.cloudCover * 0.6) },
      ambient: { ...k.ambient, intensity: k.ambient.intensity * (1 + w.cloudCover * 0.25) },
      sky: {
        ...k.sky,
        top: lerpRGB(k.sky.top, rgb('#6f7a86'), w.cloudCover * 0.8),
        horizon: lerpRGB(k.sky.horizon, rgb('#aab2b8'), w.cloudCover * 0.8),
        sunGlow: scaleRGB(k.sky.sunGlow, 1 - w.cloudCover * 0.7),
        stars: k.sky.stars * (1 - w.cloudCover),
      },
      fog: { color: lerpRGB(k.fog.color, rgb('#c7ccd0'), w.mist * 0.7 + w.cloudCover * 0.3), density: clamp01(k.fog.density + w.mist * 0.5 + w.rain * 0.25) },
      pool: { ...k.pool, intensity: k.pool.intensity * (1 - w.cloudCover * 0.45) },
      beam: { ...k.beam, intensity: k.beam.intensity * (1 - w.cloudCover * 0.8) * (1 - w.cloudPassing * 0.4 * cloud), haze: clamp01(k.beam.haze + w.mist * 0.4) },
      particles: { ...k.particles, rain: w.rain, mist: w.mist, dust: k.particles.dust * (1 - w.rain) },
      plantMotion: { wind, speed: k.plantMotion.speed * (1 + w.windBoost * 0.6) },
      backgroundBrightness: k.backgroundBrightness * (1 - w.rain * 0.25 - w.cloudCover * 0.1),
      wetness: w.wetness,
      audio: {
        ...k.audio,
        ...Object.fromEntries(
          (Object.keys(w.audio) as AudioLayerId[]).map((layer) => [layer, Math.max(k.audio[layer], w.audio[layer] ?? 0)]),
        ),
        birds: k.audio.birds * (1 - w.rain * 0.7),
        wind: Math.max(k.audio.wind, w.audio.wind ?? 0) + w.windBoost * 0.2,
      },
      birdActivity: k.birdActivity * (1 - w.rain * 0.8),
    };
  }
}

/** Fractional local hour for a Date — what AUTO feeds the engine. */
export function localHour(date: Date = new Date()): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}
