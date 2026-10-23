// Ludo: 2 or 4 players, 4 tokens each. A token is in the base (-1), on the
// shared track (0–50 relative to its own start), in its home column (51–56),
// or home (57). Roll a 6 to leave the base; a 6 or a capture gives another
// roll; landing on an opponent on a non-safe square sends it home.
export const TRACK = 52;
export const HOME = 57;
export const START_OFFSET = [0, 13, 26, 39];
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export interface LudoState {
  players: number; // 2 or 4 (player 0 is the child; others are computer)
  tokens: number[][]; // per player, 4 positions
  turn: number;
  dice: number | null;
  sixes: number;
  winner: number | null;
  log: string[];
}

export function initialLudo(players: 2 | 4): LudoState {
  const active = players === 2 ? [0, 2] : [0, 1, 2, 3];
  return { players, tokens: [0, 1, 2, 3].map((p) => (active.includes(p) ? [-1, -1, -1, -1] : [HOME, HOME, HOME, HOME])), turn: 0, dice: null, sixes: 0, winner: null, log: [] };
}

export const isActive = (s: LudoState, p: number) => (s.players === 2 ? p === 0 || p === 2 : true);
export const nextPlayer = (s: LudoState, p: number) => (s.players === 2 ? (p === 0 ? 2 : 0) : (p + 1) % 4);
export const absolute = (player: number, pos: number) => (pos >= 0 && pos <= 50 ? (START_OFFSET[player]! + pos) % TRACK : -1);

export function movable(s: LudoState, player: number, dice: number): number[] {
  return s.tokens[player]!.map((pos, i) => ({ pos, i })).filter(({ pos }) => (pos === -1 ? dice === 6 : pos < HOME && pos + dice <= HOME)).map(({ i }) => i);
}

export function roll(s: LudoState, random: () => number): LudoState {
  if (s.dice !== null || s.winner !== null) return s;
  const dice = Math.floor(random() * 6) + 1;
  const options = movable(s, s.turn, dice);
  if (options.length === 0) {
    const bonus = dice === 6 && s.sixes < 2;
    return { ...s, dice: null, sixes: bonus ? s.sixes + 1 : 0, turn: bonus ? s.turn : nextPlayer(s, s.turn), log: [...s.log.slice(-5), `P${s.turn + 1} rolled ${dice}: no move`] };
  }
  return { ...s, dice };
}

export function moveToken(s: LudoState, player: number, token: number): LudoState {
  if (s.dice === null || player !== s.turn || s.winner !== null) return s;
  const dice = s.dice;
  if (!movable(s, player, dice).includes(token)) return s;
  const tokens = s.tokens.map((t) => t.slice());
  const from = tokens[player]![token]!;
  const to = from === -1 ? 0 : from + dice;
  tokens[player]![token] = to;
  let captured = false;
  const abs = absolute(player, to);
  if (abs >= 0 && !SAFE.has(abs)) {
    for (let p = 0; p < 4; p++) {
      if (p === player) continue;
      tokens[p] = tokens[p]!.map((pos) => {
        if (absolute(p, pos) === abs) {
          captured = true;
          return -1;
        }
        return pos;
      });
    }
  }
  const won = tokens[player]!.every((p) => p === HOME);
  const extra = dice === 6 || captured || to === HOME;
  const sixes = dice === 6 ? s.sixes + 1 : 0;
  const threeSixes = sixes >= 3;
  const turn = won ? player : extra && !threeSixes ? player : nextPlayer(s, player);
  return { ...s, tokens, dice: null, sixes: turn === player ? sixes : 0, winner: won ? player : null, turn, log: [...s.log.slice(-5), `P${player + 1} moved ${from === -1 ? 'out' : `+${dice}`}${captured ? ' and captured!' : ''}`] };
}

/** Computer choice: prefer capturing, then entering, then furthest token. */
export function chooseToken(s: LudoState, player: number, random: () => number): number {
  const dice = s.dice!;
  const options = movable(s, player, dice);
  const score = (i: number) => {
    const from = s.tokens[player]![i]!;
    const to = from === -1 ? 0 : from + dice;
    let v = to;
    const abs = absolute(player, to);
    if (abs >= 0 && !SAFE.has(abs)) {
      for (let p = 0; p < 4; p++) if (p !== player && s.tokens[p]!.some((pos) => absolute(p, pos) === abs)) v += 100;
    }
    if (to === HOME) v += 60;
    if (from === -1) v += 30;
    if (abs >= 0 && SAFE.has(abs)) v += 5;
    return v + random();
  };
  return options.sort((a, b) => score(b) - score(a))[0]!;
}

// Board coordinates (15×15 grid) of the 52 track cells, starting at player 0's start (red, left arm).
export function trackCell(abs: number): [number, number] {
  const cells: [number, number][] = [];
  for (let c = 1; c <= 5; c++) cells.push([c, 6]);
  for (let r = 5; r >= 0; r--) cells.push([6, r]);
  cells.push([7, 0]);
  for (let r = 0; r <= 5; r++) cells.push([8, r]);
  for (let c = 9; c <= 14; c++) cells.push([c, 6]);
  cells.push([14, 7]);
  for (let c = 14; c >= 9; c--) cells.push([c, 8]);
  for (let r = 9; r <= 14; r++) cells.push([8, r]);
  cells.push([7, 14]);
  for (let r = 14; r >= 9; r--) cells.push([6, r]);
  for (let c = 5; c >= 0; c--) cells.push([c, 8]);
  cells.push([0, 7]);
  cells.push([0, 6]); // 52nd cell: the one just before red's start
  return cells[abs % TRACK]!;
}

export function homeCell(player: number, step: number): [number, number] {
  // step 1..6 along the home column towards the centre
  switch (player) {
    case 0:
      return [step, 7];
    case 1:
      return [7, step];
    case 2:
      return [14 - step, 7];
    default:
      return [7, 14 - step];
  }
}

export function baseCell(player: number, token: number): [number, number] {
  const corner = [[1.5, 1.5], [10.5, 1.5], [10.5, 10.5], [1.5, 10.5]][player]!;
  return [corner[0]! + (token % 2) * 2, corner[1]! + Math.floor(token / 2) * 2];
}
