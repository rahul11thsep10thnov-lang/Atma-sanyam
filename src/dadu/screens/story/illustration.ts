// Maps a story page's illustration key to a side-view background and the
// characters shown with Dadaji. Dedicated per-page illustrations are an open
// asset item (ASSET_COMPLETION_MATRIX.md); until then scenes are composed.
import type { SideBackgroundKey } from '../../render';
import type { CharacterKey } from '../../core/characters';

export function sceneForIllustration(key: string): { background: SideBackgroundKey; extras: CharacterKey[] } {
  const k = key.toLowerCase();
  if (/river|croc|well|pond|water/.test(k)) return { background: 'pond', extras: [] };
  if (/forest|lion|deer|jackal|howl|tiger|den|tree|monkey|jungle|hunt/.test(k)) return { background: 'forest', extras: [] };
  if (/court|king|akbar|birbal|tenali|laugh|palace|minister/.test(k)) return { background: 'bazaar', extras: ['chintu'] };
  if (/garden|farmer|mango|ganga|thieves|seed|plant/.test(k)) return { background: 'garden_bed', extras: ['gauri'] };
  if (/moon|night|sleep|star|bed/.test(k)) return { background: 'bedroom', extras: ['chintu'] };
  if (/mitthu|sing|parrot|bird|arriv|job/.test(k)) return { background: 'veranda', extras: ['mitthu', 'chintu'] };
  if (/mountain|peak|hill/.test(k)) return { background: 'mountains', extras: [] };
  if (/library|book|read/.test(k)) return { background: 'library', extras: ['chikki'] };
  return { background: 'living', extras: ['chintu'] };
}
