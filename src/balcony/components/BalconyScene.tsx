import React, { useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { BalconyState } from '../types';
import { visualFor } from '../engine/EnvironmentManager';
import { useParallax } from '../hooks/useParallax';
import { SceneMetricsProvider } from './SceneMetrics';
import { SkyLayer } from './layers/SkyLayer';
import { CityscapeLayer } from './layers/CityscapeLayer';
import { ArchitectureLayer } from './layers/ArchitectureLayer';
import { WallArtLayer } from './layers/WallArtLayer';
import { PlantsLayer } from './layers/PlantsLayer';
import { FurnitureLayer } from './layers/FurnitureLayer';
import { DecorationLayer } from './layers/DecorationLayer';
import { ForegroundLayer } from './layers/ForegroundLayer';
import { AtmosphereLayer } from './layers/AtmosphereLayer';

interface Props {
  state: BalconyState;
}

// Section 9's worked example, applied to each of the spec's named bands.
// Wall art, furniture and decoration ride with the architecture — they're
// all fixed to the balcony's own structure, one depth plane.
const PARALLAX_STRENGTH = { sky: 0.2, background: 0.5, architecture: 1, plants: 1.5, foreground: 2 };

/**
 * BalconyScene composes every layer (section 1) in back-to-front order,
 * feeds them the current environment's visual config, and wraps each band
 * in its own parallax strength. It owns nothing about *what* is unlocked or
 * growing — that's BalconyState, produced by BalconyEngine — only how the
 * scene is laid out and lit.
 */
export function BalconyScene({ state }: Props) {
  const [metrics, setMetrics] = useState({ width: 0, height: 0 });
  const { panHandlers, layerStyle } = useParallax(state.environment.motionEffectsEnabled);
  const visual = visualFor(state.environment.mode);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== metrics.width || height !== metrics.height)) {
      setMetrics({ width, height });
    }
  };

  if (metrics.width === 0) {
    return <View style={StyleSheet.absoluteFill} onLayout={onLayout} />;
  }

  return (
    <SceneMetricsProvider value={metrics}>
      <View style={StyleSheet.absoluteFill} onLayout={onLayout} {...panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, layerStyle(PARALLAX_STRENGTH.sky)]}>
          <SkyLayer visual={visual} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, layerStyle(PARALLAX_STRENGTH.background)]}>
          <CityscapeLayer visual={visual} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, layerStyle(PARALLAX_STRENGTH.architecture)]}>
          <ArchitectureLayer visual={visual} />
          <WallArtLayer artwork={state.artwork} puzzle={state.puzzle} />
          <FurnitureLayer objects={state.objects} />
          <DecorationLayer objects={state.objects} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, layerStyle(PARALLAX_STRENGTH.plants)]}>
          <PlantsLayer plants={state.plants} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, layerStyle(PARALLAX_STRENGTH.foreground)]} pointerEvents="none">
          <ForegroundLayer />
        </Animated.View>

        <Animated.View
          style={[StyleSheet.absoluteFill, layerStyle(PARALLAX_STRENGTH.sky)]}
          pointerEvents="none"
        >
          <AtmosphereLayer visual={visual} />
        </Animated.View>
      </View>
    </SceneMetricsProvider>
  );
}
