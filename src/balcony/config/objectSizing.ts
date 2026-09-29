/** Display size and anchor point per asset key — kept alongside the object
 * catalog so adding a new object is still just "add a catalog entry, a size
 * here, and a render case in BalconyObjectView.tsx", nothing else. */
export const OBJECT_SIZE: Record<string, { width: number; height: number; anchor: 'bottom' | 'top' | 'center' }> = {
  'terracotta-pot': { width: 56, height: 76, anchor: 'bottom' },
  'hanging-planter': { width: 70, height: 108, anchor: 'top' },
  'wood-chair': { width: 66, height: 96, anchor: 'bottom' },
  'brass-wall-plate': { width: 64, height: 64, anchor: 'center' },
  'hanging-lantern': { width: 56, height: 88, anchor: 'top' },
};

export function sizeForAsset(asset: string) {
  return OBJECT_SIZE[asset] ?? { width: 60, height: 60, anchor: 'bottom' as const };
}
