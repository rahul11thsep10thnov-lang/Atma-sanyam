import { Platform } from 'react-native';

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityProfile {
  level: QualityLevel;
  /** Intended render resolution relative to the GL drawing buffer. Applied
   * once the performance step adds render-to-texture; see Renderer.ts. */
  resolutionScale: number;
  /** Real sun shadow map (HIGH) vs. cheap contact "blob" shadows. */
  shadowMap: boolean;
  shadowMapSize: number;
  maxObjects: number;
  /** Ambient animation (leaf sway, cloud drift) frame cap. */
  ambientFps: number;
  antialias: boolean;
}

const PROFILES: Record<QualityLevel, QualityProfile> = {
  LOW: { level: 'LOW', resolutionScale: 0.75, shadowMap: false, shadowMapSize: 0, maxObjects: 24, ambientFps: 20, antialias: false },
  MEDIUM: { level: 'MEDIUM', resolutionScale: 1, shadowMap: false, shadowMapSize: 0, maxObjects: 40, ambientFps: 30, antialias: true },
  HIGH: { level: 'HIGH', resolutionScale: 1, shadowMap: true, shadowMapSize: 1024, maxObjects: 60, ambientFps: 30, antialias: true },
};

export function profileFor(level: QualityLevel): QualityProfile {
  return PROFILES[level];
}

/** A conservative default until a real device probe (memory, GPU string,
 * sustained frame time) lands in the performance step. iOS devices that can
 * run this SDK are uniformly capable; Android spans a decade of hardware,
 * so start at MEDIUM and let the user raise it. */
export function recommendedQuality(): QualityLevel {
  return Platform.OS === 'ios' ? 'HIGH' : 'MEDIUM';
}
