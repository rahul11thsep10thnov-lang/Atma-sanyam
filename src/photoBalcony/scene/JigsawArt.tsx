// An artwork assembled from jigsaw pieces: the revealed pieces show the
// picture, the rest show the mat board. Used on the wall (small) and in the
// Gallery (large).
import React, { useId, useMemo } from 'react';
import { ImageSourcePropType } from 'react-native';
import Svg, { ClipPath, Defs, G, Image as SvgImage, Path, Rect } from 'react-native-svg';
import { buildJigsaw } from './jigsaw';

interface Props {
  artId: string;
  image: ImageSourcePropType;
  width: number;
  height: number;
  rows: number;
  cols: number;
  revealed: number;
  /** Faint seams between pieces (hidden once the artwork is mounted). */
  seams?: boolean;
  board?: string;
}

export function JigsawArt({ artId, image, width, height, rows, cols, revealed, seams = true, board = '#d8d2c6' }: Props) {
  // geometry is built once in a unit space and scaled, so resizing is free
  const { pieces, order } = useMemo(() => buildJigsaw(artId, rows, cols, 1000, 1000 * (height / width)), [artId, rows, cols, height, width]);
  const shown = useMemo(() => order.slice(0, Math.max(0, Math.min(order.length, revealed))).map((i) => pieces[i]), [order, pieces, revealed]);
  const vbH = 1000 * (height / width);
  const clipId = `jig-${artId}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const complete = shown.length >= pieces.length;
  return (
    <Svg width={width} height={height} viewBox={`0 0 1000 ${vbH}`}>
      <Rect x={0} y={0} width={1000} height={vbH} fill={board} />
      {!complete && (
        <Defs>
          <ClipPath id={clipId}>
            {shown.map((p) => (
              <Path key={p.index} d={p.path} />
            ))}
          </ClipPath>
        </Defs>
      )}
      <SvgImage href={image} x={0} y={0} width={1000} height={vbH} preserveAspectRatio="xMidYMid slice" clipPath={complete ? undefined : `url(#${clipId})`} />
      {seams && (
        <G>
          {shown.map((p) => (
            <Path key={`s${p.index}`} d={p.path} fill="none" stroke="rgba(30,20,10,0.28)" strokeWidth={1.4} />
          ))}
          {shown.map((p) => (
            <Path key={`h${p.index}`} d={p.path} fill="none" stroke="rgba(255,250,240,0.18)" strokeWidth={0.8} transform="translate(-0.8,-0.8)" />
          ))}
        </G>
      )}
    </Svg>
  );
}
