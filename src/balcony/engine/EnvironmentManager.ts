import { EnvironmentMode, EnvironmentState } from '../types';
import { DEFAULT_ENVIRONMENT, ENVIRONMENTS } from '../config/environmentConfig';

export function createInitialEnvironmentState(): EnvironmentState {
  return {
    mode: DEFAULT_ENVIRONMENT,
    previousMode: DEFAULT_ENVIRONMENT,
    motionEffectsEnabled: true,
  };
}

export function setMode(state: EnvironmentState, mode: EnvironmentMode): EnvironmentState {
  if (mode === state.mode) return state;
  return { ...state, mode, previousMode: state.mode };
}

/** NIGHT and RAIN are reachable both as ordinary environment picks and as
 * one-tap quick toggles (section 16's demo buttons) that remember and restore
 * whatever mode was showing before them. */
function toggleQuickMode(state: EnvironmentState, quickMode: EnvironmentMode): EnvironmentState {
  if (state.mode === quickMode) {
    return { ...state, mode: state.previousMode, previousMode: state.previousMode };
  }
  return { ...state, mode: quickMode, previousMode: state.mode };
}

export const toggleNight = (state: EnvironmentState) => toggleQuickMode(state, 'NIGHT');
export const toggleRain = (state: EnvironmentState) => toggleQuickMode(state, 'RAIN');

export function setMotionEffectsEnabled(state: EnvironmentState, enabled: boolean): EnvironmentState {
  return { ...state, motionEffectsEnabled: enabled };
}

export function visualFor(mode: EnvironmentMode) {
  return ENVIRONMENTS[mode];
}
