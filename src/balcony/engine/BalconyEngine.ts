import { BalconyState, EnvironmentMode, Plant, ScenePosition } from '../types';
import * as PlantGrowthManager from './PlantGrowthManager';
import * as RewardManager from './RewardManager';
import * as EnvironmentManager from './EnvironmentManager';
import * as PuzzleManager from './PuzzleManager';
import { PLANT_SPECIES_CATALOG, PlantSpecies } from '../config/objectCatalog';
import { ARTWORK_REWARD_ID } from '../config/rewardConfig';
import { GROWTH_THRESHOLDS } from '../config/plantConfig';

type Listener = (state: BalconyState) => void;

function createPlant(species: PlantSpecies): Plant {
  return {
    id: species.id,
    name: species.name,
    type: species.type,
    position: species.position,
    growthLevel: 'SEED',
    health: 1,
    requiredFocusMinutes: GROWTH_THRESHOLDS[GROWTH_THRESHOLDS.length - 1].minutes,
    currentFocusMinutes: 0,
    isUnlocked: true,
    isPlaced: true,
  };
}

/**
 * The single orchestrator for the Focus Balcony system (section 15). Holds
 * the current BalconyState, exposes intention-revealing commands the UI and
 * (later) the real focus timer call, and composes the pure managers below it
 * — PlantGrowthManager, RewardManager, EnvironmentManager, PuzzleManager —
 * none of which know about each other or about React.
 *
 * Usage from a component: `const engine = useMemo(() => new BalconyEngine(initial), [])`,
 * then `engine.subscribe(setState)` to re-render on every command.
 */
export class BalconyEngine {
  private state: BalconyState;
  private listeners = new Set<Listener>();

  constructor(initialState: BalconyState) {
    this.state = initialState;
  }

  getState(): BalconyState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(next: BalconyState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }

  /** Call periodically while a session is running (e.g. once a minute) to
   * grow the active plant gradually (section 4). Does not touch the lifetime
   * reward total or the artwork — those finalize only on
   * completeFocusSession, so a session later broken doesn't leave partial
   * reward credit behind. */
  tickActivePlantGrowth(minutes: number) {
    if (minutes <= 0) return;
    const plant = this.activePlant();
    if (!plant) return;
    const updated = PlantGrowthManager.applyFocusMinutes(plant, minutes);
    this.commit({ ...this.state, plants: this.replacePlant(updated) });
  }

  /** A focus session finished successfully. Finalizes plant growth, banks
   * the minutes into the lifetime reward total, unlocks anything newly
   * earned, and feeds the artwork puzzle. Demo mode's "+10/+25/+60" and
   * "Complete focus" buttons, and later the real timer, all call this. */
  completeFocusSession(minutes: number) {
    if (minutes <= 0) return;
    let state = this.state;

    const active = this.activePlant();
    if (active) {
      const grown = PlantGrowthManager.applyFocusMinutes(active, minutes);
      state = { ...state, plants: state.plants.map((p) => (p.id === grown.id ? grown : p)) };
    }

    const previousTotal = state.reward.totalFocusMinutes;
    const newTotal = previousTotal + minutes;
    const newRules = RewardManager.getNewlyUnlockedRules(previousTotal, newTotal, state.reward.claimedRewardIds);

    let objects = state.objects;
    let plants = state.plants;
    let artwork = state.artwork;
    const claimed = [...state.reward.claimedRewardIds];

    for (const rule of newRules) {
      claimed.push(rule.id);
      if (rule.unlockObjectId === ARTWORK_REWARD_ID) {
        artwork = PuzzleManager.unlockArtwork(artwork);
        continue;
      }
      const species = PLANT_SPECIES_CATALOG[rule.unlockObjectId];
      if (species) {
        plants = [...plants, createPlant(species)];
        continue;
      }
      objects = objects.map((o) => (o.id === rule.unlockObjectId ? { ...o, isUnlocked: true, isPlaced: true } : o));
    }

    state = {
      ...state,
      reward: { totalFocusMinutes: newTotal, claimedRewardIds: claimed },
      objects,
      plants,
      artwork,
    };

    const puzzleResult = PuzzleManager.addFocusMinutes(state.artwork, state.puzzle, minutes);
    state = { ...state, artwork: puzzleResult.artwork, puzzle: puzzleResult.puzzle };

    state = { ...state, activePlantId: this.pickActivePlantId(state) };

    this.commit(state);
  }

  /** A focus session on the active plant was intentionally broken (section
   * 3). Never destroys progress — only health and the displayed state take
   * a hit, and a later successful session fully restores it. */
  breakFocusSession() {
    const plant = this.activePlant();
    if (!plant) return;
    const broken = PlantGrowthManager.applyBreak(plant);
    this.commit({ ...this.state, plants: this.replacePlant(broken) });
  }

  unlockArtworkNow() {
    this.commit({ ...this.state, artwork: PuzzleManager.unlockArtwork(this.state.artwork) });
  }

  /** Demo-mode shortcut — jump straight to a fully revealed, mounted
   * artwork without simulating hundreds of focus minutes. */
  completePuzzleNow() {
    const unlocked = PuzzleManager.unlockArtwork(this.state.artwork);
    const revealed = PuzzleManager.revealAllPieces(unlocked, this.state.puzzle);
    const mounted = PuzzleManager.mountArtwork(revealed.artwork);
    this.commit({ ...this.state, artwork: mounted, puzzle: revealed.puzzle });
  }

  mountCompletedArtwork() {
    this.commit({ ...this.state, artwork: PuzzleManager.mountArtwork(this.state.artwork) });
  }

  setEnvironment(mode: EnvironmentMode) {
    this.commit({ ...this.state, environment: EnvironmentManager.setMode(this.state.environment, mode) });
  }

  toggleNight() {
    this.commit({ ...this.state, environment: EnvironmentManager.toggleNight(this.state.environment) });
  }

  toggleRain() {
    this.commit({ ...this.state, environment: EnvironmentManager.toggleRain(this.state.environment) });
  }

  setMotionEffectsEnabled(enabled: boolean) {
    this.commit({
      ...this.state,
      environment: EnvironmentManager.setMotionEffectsEnabled(this.state.environment, enabled),
    });
  }

  /** Minimal placement hook the customization phase builds on — moves an
   * already-unlocked object or plant to a new normalized scene position. */
  moveObject(id: string, position: ScenePosition) {
    this.commit({
      ...this.state,
      objects: this.state.objects.map((o) => (o.id === id ? { ...o, position } : o)),
      plants: this.state.plants.map((p) => (p.id === id ? { ...p, position } : p)),
    });
  }

  /** Resets to a fresh, almost-empty balcony — used by the demo panel so
   * testing a full unlock run doesn't require reinstalling the app. */
  reset(freshState: BalconyState) {
    this.commit(freshState);
  }

  private activePlant(): Plant | undefined {
    return this.state.plants.find((p) => p.id === this.state.activePlantId);
  }

  private replacePlant(updated: Plant): Plant[] {
    return this.state.plants.map((p) => (p.id === updated.id ? updated : p));
  }

  /** Keeps exactly one plant "currently growing" (section 4): stay on the
   * active plant until it flowers, then hand off to the next unlocked plant
   * that hasn't started growing yet. */
  private pickActivePlantId(state: BalconyState): string | null {
    const current = state.plants.find((p) => p.id === state.activePlantId);
    if (current && !PlantGrowthManager.isFullyGrown(current)) return current.id;
    const dormant = state.plants.find((p) => p.id !== state.activePlantId && p.currentFocusMinutes === 0);
    if (dormant) return dormant.id;
    return current?.id ?? state.activePlantId;
  }
}
