// Checks the Paradise Garden's landscaper: every segment holds at least 150
// plants, slots never overlap, never sit on a path, bridge, lantern or the
// fountain, and a reshuffle (another seed) is deterministic.
//   node --experimental-strip-types tools/checks/paradise_layout.mjs
import { BEDS, KEEP_CLEAR, PLATE_H, PLATE_W, slotsFor } from '../../src/paradise/layout.ts';

const SEGMENTS = ['flowers', 'trees', 'indoor', 'fruits', 'herbs'];
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
let bad = 0;
for (const seg of SEGMENTS) {
  for (const seed of [11, 23, 9001]) {
    const slots = slotsFor(seg, seed);
    const again = slotsFor(seg, seed);
    if (JSON.stringify(slots) !== JSON.stringify(again)) { bad++; console.log(`BAD ${seg} seed ${seed}: not deterministic`); }
    if (slots.length < 150) { bad++; console.log(`BAD ${seg} seed ${seed}: only ${slots.length} slots`); }
    let minGap = Infinity;
    for (let i = 0; i < slots.length; i++) {
      const a = slots[i];
      if (KEEP_CLEAR.some((k) => inRect(a.x, a.y, k))) { bad++; console.log(`BAD ${seg}: slot ${i} on a keep-clear area`); }
      if (!BEDS.some((b) => b.segment === seg && inRect(a.x, a.y, b.rect))) { bad++; console.log(`BAD ${seg}: slot ${i} outside its beds`); }
      for (let j = i + 1; j < slots.length; j++) {
        const b = slots[j];
        const d = Math.hypot((a.x - b.x) * PLATE_W, (a.y - b.y) * PLATE_H);
        minGap = Math.min(minGap, d);
        if (d < 12) { bad++; console.log(`BAD ${seg}: slots ${i} and ${j} overlap (${d.toFixed(1)} px)`); }
      }
    }
    const bands = slots.reduce((m, s) => ((m[s.band] = (m[s.band] ?? 0) + 1), m), {});
    console.log(`ok  ${seg.padEnd(8)} seed ${String(seed).padStart(4)}: ${String(slots.length).padStart(3)} slots, closest pair ${minGap.toFixed(0)} px, bands ${JSON.stringify(bands)}`);
  }
}
console.log(bad ? `${bad} problem(s)` : 'all layout checks pass');
process.exit(bad ? 1 : 0);
