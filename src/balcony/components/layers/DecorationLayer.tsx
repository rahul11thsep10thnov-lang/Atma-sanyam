import React from 'react';
import { BalconyObjectState } from '../../types';
import { sizeForAsset } from '../../config/objectSizing';
import { AnchoredSprite } from '../AnchoredSprite';
import { BalconyObjectView } from '../BalconyObjectView';

interface Props {
  objects: BalconyObjectState[];
}

const DECOR_CATEGORIES = new Set<BalconyObjectState['category']>(['POTS', 'DECORATION', 'LIGHTING', 'SPECIAL_OBJECTS']);

/** Layer 6 — decorative objects: pots, hanging planters, wall plates,
 * lanterns. Everything here is unlocked-but-not-furniture, per the spec's
 * category list. */
export function DecorationLayer({ objects }: Props) {
  const decor = objects.filter((o) => DECOR_CATEGORIES.has(o.category) && o.isPlaced);
  return (
    <>
      {decor.map((object) => {
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
