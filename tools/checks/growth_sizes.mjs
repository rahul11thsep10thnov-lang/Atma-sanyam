// Checks the single growth-size table against the exact minute rules.
//   node --experimental-strip-types tools/checks/growth_sizes.mjs
import { sizeForMinutes, growthProgress, MIN_PLANT_MINUTES, SIZE_GRIDS } from '../../src/growth/size.ts';

const cases = [
  [0, null], [5, null], [14, null], [14.99, null],
  [15, 1], [20, 1], [29, 1], [29.9, 1],
  [30, 2], [45, 2], [59, 2],
  [60, 3], [75, 3], [89, 3],
  [90, 4], [119, 4],
  [120, 5], [149, 5],
  [150, 6], [165, 6], [179, 6],
  [180, 7], [210, 7], [240, 7], [600, 7],
];
let bad = 0;
for (const [minutes, expected] of cases) {
  const got = sizeForMinutes(minutes);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${String(minutes).padStart(6)} min → ${got === null ? 'no plant' : `Size ${got}`}${ok ? '' : ` (expected ${expected})`}`);
}
if (MIN_PLANT_MINUTES !== 15) { bad++; console.log('BAD minimum is not 15'); }
// growth is monotonic and never shows more than the final size
for (const target of [15, 29, 30, 75, 120, 180, 240]) {
  let last = -1;
  for (let e = 0; e <= target; e += target / 40) {
    const g = growthProgress(e, target);
    if (g < last - 1e-9) { bad++; console.log(`BAD growth went backwards at ${e}/${target}`); }
    if (g > (sizeForMinutes(target) ?? 1) + 1e-9) { bad++; console.log(`BAD growth exceeds final size at ${e}/${target}`); }
    last = g;
  }
}
// every jigsaw, of every size, is about 10,000 pieces
for (const [size, g] of Object.entries(SIZE_GRIDS)) {
  const pieces = g.rows * g.cols;
  if (pieces < 9500 || pieces > 10500) { bad++; console.log(`BAD size ${size} jigsaw has ${pieces} pieces`); }
}
console.log(`ok  every jigsaw size has ${SIZE_GRIDS[1].rows * SIZE_GRIDS[1].cols} pieces (${SIZE_GRIDS[1].rows} x ${SIZE_GRIDS[1].cols})`);
console.log(bad ? `FAILED ${bad}` : 'all growth-size checks passed');
process.exit(bad ? 1 : 0);
