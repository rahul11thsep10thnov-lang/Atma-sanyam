import React from 'react';
import { BalconyObjectState } from '../../types';
import { sizeForAsset } from '../../config/objectSizing';
import { AnchoredSprite } from '../AnchoredSprite';
import { BalconyObjectView } from '../BalconyObjectView';

interface Props {
  objects: BalconyObjectState[];
}

/** Layer 5 — furniture only (a chair to sit and focus in, later a table, a
 * bench…). Kept separate from DecorationLayer so furniture always renders
 * just above the plants and just below decoration, matching the spec's
 * layer order. */
export function FurnitureLayer({ objects }: Props) {
  const furniture = objects.filter((o) => o.category === 'FURNITURE' && o.isPlaced);
  return (
    <>
      {furniture.map((object) => {
        const { width, height, anchor } = sizeForAsset(object.asset);
        return (
          <AnchoredSprite
            key={object.id}
            position={object.position}
            width={width}
            height={height}
            anchor={anchor}
            scale={object.scale}
            rotation={object.rotation}
          >
            <BalconyObjectView object={object} width={width} height={height} />
          </AnchoredSprite>
        );
      })}
    </>
  );
}
