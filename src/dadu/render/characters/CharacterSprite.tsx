// One component for every character, both camera views. `facing` picks the
// drawn view when `view` is omitted (south faces the camera, north shows the
// back) and mirrors west-facing sprites. Heights follow HEIGHT_CHART so
// characters keep their relative sizes in any scene.
import React from 'react';
import { G, Svg } from 'react-native-svg';
import type { CharacterKey } from '../../core/characters';
import { CHARACTERS, canonicalCharacter } from '../../core/characters';
import type { CharacterSpriteProps, RigProps, SpriteView } from '../types';
import { useClock } from '../clock';
import { DadajiRig, DADAJI_BOX } from './Dadaji';
import { ChintuRig, CHINTU_BOX } from './Chintu';
import { BuddyRig } from './Buddy';
import { ChikkiRig, CHIKKI_BOX } from './Chikki';
import { GauriRig } from './Gauri';
import { NanduRig } from './Nandu';
import { MitthuRig, MITTHU_BOX } from './Mitthu';
import { QUAD_BOX } from './quadruped';

export const RIGS: Record<CharacterKey, { Rig: (p: RigProps) => React.ReactElement; box: { w: number; h: number }; /** Fraction of the box height that is the drawn body (shadow excluded). */ bodyFrac: number }> = {
  dadaji: { Rig: DadajiRig, box: DADAJI_BOX, bodyFrac: 1 },
  chintu: { Rig: ChintuRig, box: CHINTU_BOX, bodyFrac: 1 },
  buddy: { Rig: BuddyRig, box: QUAD_BOX, bodyFrac: 0.8 },
  chikki: { Rig: ChikkiRig, box: CHIKKI_BOX, bodyFrac: 0.95 },
  gauri: { Rig: GauriRig, box: QUAD_BOX, bodyFrac: 1 },
  nandu: { Rig: NanduRig, box: QUAD_BOX, bodyFrac: 0.72 },
  mitthu: { Rig: MitthuRig, box: MITTHU_BOX, bodyFrac: 0.9 },
};

/** Relative heights (Dadaji = 1) from the character registry. */
export const HEIGHT_CHART: Record<CharacterKey, number> = Object.fromEntries(
  (Object.keys(CHARACTERS) as CharacterKey[]).map((k) => [k, CHARACTERS[k].heightWu / CHARACTERS.dadaji.heightWu])
) as Record<CharacterKey, number>;

export function viewForFacing(facing: CharacterSpriteProps['facing'], sideWhenEast = false): SpriteView {
  if (!facing) return 'front';
  if (facing === 'ne' || facing === 'nw') return 'back';
  return sideWhenEast ? 'side' : 'front';
}

/** Pixel height for a character so that Dadaji is `dadajiPx` tall. */
export function spriteHeight(key: CharacterKey, dadajiPx: number): number {
  return dadajiPx * HEIGHT_CHART[key];
}

export function CharacterSprite({ characterKey, view, pose = 'stand', expression = 'neutral', facing = 'se', size, animate = true, reducedMotion = false, talking, onPress, label }: CharacterSpriteProps) {
  const key = canonicalCharacter(characterKey) ?? 'chintu';
  const clock = useClock();
  const t = animate && !reducedMotion ? clock : 0;
  const { Rig, box } = RIGS[key];
  const v = view ?? viewForFacing(facing);
  const mirror = facing === 'nw' || facing === 'sw';
  const w = (box.w / box.h) * size;
  return (
    <Svg width={w} height={size} viewBox={`0 0 ${box.w} ${box.h}`} onPress={onPress} accessibilityLabel={label}>
      <G transform={mirror ? `translate(${box.w} 0) scale(-1 1)` : undefined}>
        <Rig view={v} pose={pose} expression={expression} t={t} talking={talking} />
      </G>
    </Svg>
  );
}

/** Head-only avatar for dialogue bubbles. */
export function CharacterFace({ characterKey, expression = 'neutral', size, talking, animate = true, reducedMotion = false }: { characterKey: CharacterKey | string; expression?: CharacterSpriteProps['expression']; size: number; talking?: boolean; animate?: boolean; reducedMotion?: boolean }) {
  const key = canonicalCharacter(characterKey) ?? 'chintu';
  const clock = useClock();
  const t = animate && !reducedMotion ? clock : 0;
  const { Rig } = RIGS[key];
  const crop: Record<CharacterKey, string> = {
    dadaji: '18 0 64 64', chintu: '18 0 64 62', buddy: '40 10 60 60', chikki: '22 0 56 56', gauri: '38 6 64 64', nandu: '42 12 56 56', mitthu: '14 8 52 52',
  };
  return (
    <Svg width={size} height={size} viewBox={crop[key]}>
      <Rig view="front" pose="stand" expression={expression} t={t} talking={talking} />
    </Svg>
  );
}
