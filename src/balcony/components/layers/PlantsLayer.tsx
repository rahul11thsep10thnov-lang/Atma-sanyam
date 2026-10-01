import React from 'react';
import { Plant, PlantGrowthLevel } from '../../types';
import { AnchoredSprite } from '../AnchoredSprite';
import { PlantView } from '../PlantView';

interface Props {
  plants: Plant[];
}

// A plant reads as visibly bigger as it grows — the scale AnchoredSprite
// applies around the same anchor PlantView sways from, so growth and sway
// compose cleanly instead of fighting over one transform.
const LEVEL_SCALE: Record<PlantGrowthLevel, number> = {
  SEED: 0.55,
  SPROUT: 0.68,
  YOUNG: 0.82,
  MATURE: 0.95,
  FLOWERING: 1,
  WILTED: 0.85,
  REVIVING: 0.85,
};

/** Layer 4 — plants. Purely a placement layer: it knows *where* each placed
 * plant goes and how big its current growth stage reads, and leaves the art
 * itself to PlantView. */
export function PlantsLayer({ plants }: Props) {
  return (
    <>
      {plants
        .filter((p) => p.isPlaced)
        .map((plant) => {
          const isTree = plant.type.includes('tree');
          const baseW = isTree ? 110 : 64;
          const baseH = isTree ? 150 : 92;
          return (
            <AnchoredSprite
              key={plant.id}
              position={plant.position}
              width={baseW}
              height={baseH}
              anchor="bottom"
              scale={LEVEL_SCALE[plant.growthLevel]}
            >
              <PlantView plant={plant} width={baseW} height={baseH} />
            </AnchoredSprite>
          );
        })}
    </>
  );
}
