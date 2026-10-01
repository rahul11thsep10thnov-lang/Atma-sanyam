import React, { createContext, useContext } from 'react';
import { Dimensions } from 'react-native';

export interface SceneMetrics {
  width: number;
  height: number;
}

const initialWindow = Dimensions.get('window');

const SceneMetricsContext = createContext<SceneMetrics>({
  width: initialWindow.width,
  height: initialWindow.height,
});

export const SceneMetricsProvider = SceneMetricsContext.Provider;

/** Every layer and sprite reads the balcony scene's own measured size from
 * here, rather than the window's, so positions stay correct regardless of
 * how much of the screen the scene actually occupies. */
export function useSceneMetrics(): SceneMetrics {
  return useContext(SceneMetricsContext);
}
