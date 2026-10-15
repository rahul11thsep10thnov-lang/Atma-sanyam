// Ten-pin bowling scoring: strikes, spares, the tenth frame's bonus balls.
export function scoreFrames(rolls: number[]): { frames: (number | null)[]; total: number; complete: boolean } {
  const frames: (number | null)[] = [];
  let i = 0;
  let total = 0;
  for (let f = 0; f < 10; f++) {
    const a = rolls[i], b = rolls[i + 1], c = rolls[i + 2];
    if (a === undefined) {
      frames.push(null);
      continue;
    }
    if (a === 10) {
      if (b === undefined || c === undefined) {
        frames.push(null);
        i += 1;
        continue;
      }
      total += 10 + b + c;
      frames.push(total);
      i += 1;
    } else if (b === undefined) {
      frames.push(null);
      i += 1;
    } else if (a + b === 10) {
      if (c === undefined) {
        frames.push(null);
        i += 2;
        continue;
      }
      total += 10 + c;
      frames.push(total);
      i += 2;
    } else {
      total += a + b;
      frames.push(total);
      i += 2;
    }
  }
  return { frames, total, complete: frames.every((f) => f !== null) };
}

/** Which frame and roll the next ball is, and the pins standing before it. */
export function nextBall(rolls: number[]): { frame: number; roll: number; standing: number; done: boolean } {
  let i = 0;
  for (let f = 0; f < 9; f++) {
    const a = rolls[i];
    if (a === undefined) return { frame: f, roll: 0, standing: 10, done: false };
    if (a === 10) {
      i += 1;
      continue;
    }
    const b = rolls[i + 1];
    if (b === undefined) return { frame: f, roll: 1, standing: 10 - a, done: false };
    i += 2;
  }
  // tenth frame
  const a = rolls[i], b = rolls[i + 1], c = rolls[i + 2];
  if (a === undefined) return { frame: 9, roll: 0, standing: 10, done: false };
  if (b === undefined) return { frame: 9, roll: 1, standing: a === 10 ? 10 : 10 - a, done: false };
  if (a === 10 || a + b === 10) {
    if (c === undefined) return { frame: 9, roll: 2, standing: a === 10 ? (b === 10 ? 10 : 10 - b) : 10, done: false };
    return { frame: 9, roll: 3, standing: 0, done: true };
  }
  return { frame: 9, roll: 2, standing: 0, done: true };
}
