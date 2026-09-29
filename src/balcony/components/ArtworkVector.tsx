import React from 'react';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';
import { BALCONY_PALETTE as P } from '../config/palette';

const PETAL_ANGLES = Array.from({ length: 8 }, (_, i) => i * 45);

/** The collectible artwork itself (section 5) — an abstract lotus medallion
 * built from layered petals and rings, in the same warm palette as the rest
 * of the balcony. Geometric and understated on purpose: Indian-inspired
 * without leaning on a literal, stereotyped image. */
export function ArtworkVector({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      <Rect x={0} y={0} width={200} height={200} fill={P.cream} />
      <Circle cx={100} cy={100} r={92} fill="none" stroke={P.brass} strokeWidth={3} />
      <Circle cx={100} cy={100} r={82} fill="none" stroke={P.terracotta} strokeWidth={1} opacity={0.5} />
      {PETAL_ANGLES.map((angle) => (
        <Ellipse key={angle} cx={100} cy={58} rx={16} ry={34} fill={P.terracotta} opacity={0.85} rotation={angle} origin="100, 100" />
      ))}
      {PETAL_ANGLES.map((angle) => (
        <Ellipse
          key={`inner-${angle}`}
          cx={100}
          cy={72}
          rx={9}
          ry={20}
          fill={P.flowerMarigold}
          opacity={0.9}
          rotation={angle + 22.5}
          origin="100, 100"
        />
      ))}
      <Circle cx={100} cy={100} r={16} fill={P.brass} />
      <Circle cx={100} cy={100} r={9} fill={P.brassLight} />
    </Svg>
  );
}
