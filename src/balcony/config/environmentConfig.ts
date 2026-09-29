import { EnvironmentMode } from '../types';

/** Visual configuration for one environment state — sky, light, ambient effects.
 * Purely data, so new environments (an unlock reward in themselves, per the
 * spec) can be added without touching any rendering code. */
export interface EnvironmentVisual {
  label: string;
  /** Sky gradient stops, top to bottom. */
  skyTop: string;
  skyBottom: string;
  /** Warm (sun) or cool (moon) glow disc shown in the sky. */
  glowColor: string;
  glowOpacity: number;
  glowX: number; // 0..1 across the sky band
  glowY: number; // 0..1 down the sky band
  /** Tint applied over the architecture layer to match the light. */
  architectureTint: string;
  architectureTintOpacity: number;
  showStars: boolean;
  showFireflies: boolean;
  showRain: boolean;
  /** Cloud opacity — 0 hides them entirely (e.g. a clear, starry night). */
  cloudOpacity: number;
  /** How warm/bright the lantern & window glow reads against this sky. */
  lightingWarmth: number; // 0..1
}

export const ENVIRONMENTS: Record<EnvironmentMode, EnvironmentVisual> = {
  MORNING: {
    label: 'Morning',
    skyTop: '#FCE8CE',
    skyBottom: '#F7CBB0',
    glowColor: '#FFE9B8',
    glowOpacity: 0.55,
    glowX: 0.18,
    glowY: 0.28,
    architectureTint: '#FFEFD9',
    architectureTintOpacity: 0.12,
    showStars: false,
    showFireflies: false,
    showRain: false,
    cloudOpacity: 0.5,
    lightingWarmth: 0.25,
  },
  AFTERNOON: {
    label: 'Afternoon',
    skyTop: '#FDF3E7',
    skyBottom: '#F6D9C4',
    glowColor: '#FFF6DE',
    glowOpacity: 0.4,
    glowX: 0.5,
    glowY: 0.12,
    architectureTint: '#FFF8EC',
    architectureTintOpacity: 0.06,
    showStars: false,
    showFireflies: false,
    showRain: false,
    cloudOpacity: 0.4,
    lightingWarmth: 0.15,
  },
  SUNSET: {
    label: 'Sunset',
    skyTop: '#F4A98A',
    skyBottom: '#D96B7A',
    glowColor: '#FFCF8E',
    glowOpacity: 0.7,
    glowX: 0.78,
    glowY: 0.4,
    architectureTint: '#FF9E7A',
    architectureTintOpacity: 0.16,
    showStars: false,
    showFireflies: false,
    showRain: false,
    cloudOpacity: 0.55,
    lightingWarmth: 0.55,
  },
  EVENING: {
    label: 'Evening',
    skyTop: '#5A5171',
    skyBottom: '#8A6A78',
    glowColor: '#F3D9B0',
    glowOpacity: 0.35,
    glowX: 0.75,
    glowY: 0.35,
    architectureTint: '#4C4460',
    architectureTintOpacity: 0.22,
    showStars: true,
    showFireflies: false,
    showRain: false,
    cloudOpacity: 0.3,
    lightingWarmth: 0.75,
  },
  NIGHT: {
    label: 'Night',
    skyTop: '#1B1F3B',
    skyBottom: '#2E2A4E',
    glowColor: '#E8E4F5',
    glowOpacity: 0.5,
    glowX: 0.22,
    glowY: 0.2,
    architectureTint: '#171638',
    architectureTintOpacity: 0.38,
    showStars: true,
    showFireflies: true,
    showRain: false,
    cloudOpacity: 0.12,
    lightingWarmth: 1,
  },
  RAIN: {
    label: 'Rain',
    skyTop: '#7C8695',
    skyBottom: '#9AA3AC',
    glowColor: '#FFFFFF',
    glowOpacity: 0.08,
    glowX: 0.5,
    glowY: 0.15,
    architectureTint: '#5F6A78',
    architectureTintOpacity: 0.28,
    showStars: false,
    showFireflies: false,
    showRain: true,
    cloudOpacity: 0.85,
    lightingWarmth: 0.5,
  },
};

export const DEFAULT_ENVIRONMENT: EnvironmentMode = 'AFTERNOON';
