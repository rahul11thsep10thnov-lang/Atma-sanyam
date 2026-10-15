// Farm Manager rules: a turn-based economy. Each day the player may plant
// crops (cost coins, take days to grow, sell for more), feed animals (cost
// feed, give produce next day) and sell at the market. Reach the coin goal
// before the season ends. Weather is seeded: a sunny day grows crops a day
// faster, a dry day pauses growth unless the plot was watered.

export interface CropKind { id: string; name: string; emoji: string; cost: number; days: number; price: number }
export interface AnimalKind { id: string; name: string; emoji: string; feedCost: number; produce: string; produceEmoji: string; producePrice: number }

export const CROPS: CropKind[] = [
  { id: 'carrot', name: 'Carrot', emoji: '🥕', cost: 2, days: 2, price: 5 },
  { id: 'tomato', name: 'Tomato', emoji: '🍅', cost: 4, days: 3, price: 10 },
  { id: 'corn', name: 'Corn', emoji: '🌽', cost: 6, days: 4, price: 16 },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', cost: 10, days: 6, price: 30 },
];
export const ANIMALS: AnimalKind[] = [
  { id: 'hen', name: 'Hen', emoji: '🐔', feedCost: 1, produce: 'egg', produceEmoji: '🥚', producePrice: 3 },
  { id: 'cow', name: 'Cow', emoji: '🐄', feedCost: 3, produce: 'milk', produceEmoji: '🥛', producePrice: 7 },
];

export type Weather = 'sunny' | 'rainy' | 'dry';

export interface Plot { crop: string | null; grown: number; watered: boolean }
export interface Animal { kind: string; fed: boolean; produce: number }
export interface FarmState {
  day: number;
  days: number;
  coins: number;
  goal: number;
  plots: Plot[];
  animals: Animal[];
  weather: Weather;
  forecast: Weather[];
  barn: Record<string, number>;
  log: string[];
}

export const FARM_LEVELS: Record<string, { plots: number; days: number; goal: number; coins: number; animals: string[] }> = {
  easy: { plots: 4, days: 10, goal: 60, coins: 20, animals: ['hen'] },
  normal: { plots: 6, days: 12, goal: 140, coins: 20, animals: ['hen', 'cow'] },
  hard: { plots: 8, days: 14, goal: 300, coins: 25, animals: ['hen', 'hen', 'cow'] },
};

export function makeForecast(random: () => number, days: number): Weather[] {
  return Array.from({ length: days }, () => {
    const r = random();
    return r < 0.5 ? 'sunny' : r < 0.8 ? 'rainy' : 'dry';
  });
}

export function initFarm(difficulty: string, random: () => number): FarmState {
  const lvl = FARM_LEVELS[difficulty] ?? FARM_LEVELS.normal!;
  const forecast = makeForecast(random, lvl.days + 1);
  return {
    day: 1,
    days: lvl.days,
    coins: lvl.coins,
    goal: lvl.goal,
    plots: Array.from({ length: lvl.plots }, () => ({ crop: null, grown: 0, watered: false })),
    animals: lvl.animals.map((kind) => ({ kind, fed: false, produce: 0 })),
    weather: forecast[0]!,
    forecast,
    barn: {},
    log: ['Welcome to your farm! Plant seeds and feed the animals.'],
  };
}

export const cropById = (id: string) => CROPS.find((c) => c.id === id)!;
export const animalById = (id: string) => ANIMALS.find((a) => a.id === id)!;

export function plant(s: FarmState, plot: number, cropId: string): FarmState {
  const p = s.plots[plot];
  const crop = cropById(cropId);
  if (!p || p.crop || !crop || s.coins < crop.cost) return s;
  return { ...s, coins: s.coins - crop.cost, plots: s.plots.map((x, i) => (i === plot ? { crop: cropId, grown: 0, watered: false } : x)) };
}

export function water(s: FarmState, plot: number): FarmState {
  const p = s.plots[plot];
  if (!p || !p.crop || p.watered) return s;
  return { ...s, plots: s.plots.map((x, i) => (i === plot ? { ...x, watered: true } : x)) };
}

/** Harvest a ripe plot into the barn. */
export function harvest(s: FarmState, plot: number): FarmState {
  const p = s.plots[plot];
  if (!p || !p.crop) return s;
  const crop = cropById(p.crop);
  if (p.grown < crop.days) return s;
  return { ...s, barn: { ...s.barn, [crop.id]: (s.barn[crop.id] ?? 0) + 1 }, plots: s.plots.map((x, i) => (i === plot ? { crop: null, grown: 0, watered: false } : x)) };
}

export function feed(s: FarmState, animal: number): FarmState {
  const a = s.animals[animal];
  if (!a || a.fed) return s;
  const kind = animalById(a.kind);
  if (s.coins < kind.feedCost) return s;
  return { ...s, coins: s.coins - kind.feedCost, animals: s.animals.map((x, i) => (i === animal ? { ...x, fed: true } : x)) };
}

/** Collect an animal's produce into the barn. */
export function collect(s: FarmState, animal: number): FarmState {
  const a = s.animals[animal];
  if (!a || a.produce === 0) return s;
  const kind = animalById(a.kind);
  return { ...s, barn: { ...s.barn, [kind.produce]: (s.barn[kind.produce] ?? 0) + a.produce }, animals: s.animals.map((x, i) => (i === animal ? { ...x, produce: 0 } : x)) };
}

export function priceOf(item: string): number {
  return CROPS.find((c) => c.id === item)?.price ?? ANIMALS.find((a) => a.produce === item)?.producePrice ?? 0;
}

/** Sell everything in the barn. */
export function sellAll(s: FarmState): FarmState {
  let coins = s.coins;
  for (const [item, n] of Object.entries(s.barn)) coins += priceOf(item) * n;
  return { ...s, coins, barn: {} };
}

export function barnValue(s: FarmState): number {
  return Object.entries(s.barn).reduce((sum, [item, n]) => sum + priceOf(item) * n, 0);
}

/** End the day: crops grow, animals produce, weather moves on. */
export function nextDay(s: FarmState): FarmState {
  const log: string[] = [];
  const plots = s.plots.map((p) => {
    if (!p.crop) return p;
    const crop = cropById(p.crop);
    if (p.grown >= crop.days) return { ...p, watered: false };
    let growth = 1;
    if (s.weather === 'sunny') growth = 2;
    if (s.weather === 'dry' && !p.watered) growth = 0;
    return { ...p, grown: Math.min(crop.days, p.grown + growth), watered: false };
  });
  const ripe = plots.filter((p, i) => p.crop && p.grown >= cropById(p.crop).days && !(s.plots[i]!.grown >= cropById(p.crop).days)).length;
  if (ripe) log.push(`${ripe} crop${ripe > 1 ? 's are' : ' is'} ready to harvest!`);
  const animals = s.animals.map((a) => {
    const kind = animalById(a.kind);
    if (a.fed) log.push(`${kind.name} gave you ${kind.produceEmoji}`);
    return { ...a, fed: false, produce: a.produce + (a.fed ? 1 : 0) };
  });
  const day = s.day + 1;
  const weather = s.forecast[day - 1] ?? 'sunny';
  if (s.weather === 'dry') log.push('It was a dry day: unwatered crops did not grow.');
  if (s.weather === 'sunny') log.push('Sunny! Crops grew extra fast.');
  return { ...s, day, plots, animals, weather, log: [...log, ...s.log].slice(0, 6) };
}

export function farmOutcome(s: FarmState): 'playing' | 'won' | 'lost' {
  if (s.coins >= s.goal) return 'won';
  if (s.day > s.days) return 'lost';
  return 'playing';
}
