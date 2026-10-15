// Run from backend/: node --experimental-strip-types scripts/gen-origami.ts
import { ORIGAMI_MODELS, AIRPLANE_MODELS } from '../../src/crafts/models.ts';
import { writeFileSync } from 'node:fs';
const out = `// Fold diagrams shared with the app's Origami Studio (src/crafts/models.ts).
// Generated from that file; edit there and re-run scripts/gen-origami.ts.
export const ORIGAMI_DIAGRAMS: Record<string, { title: string; text: string; tip?: string; diagram: Record<string, unknown> }[]> = ${JSON.stringify(Object.fromEntries([...ORIGAMI_MODELS, ...AIRPLANE_MODELS].map((m) => [m.id, m.steps])), null, 2)};
`;
writeFileSync('src/catalogue/origamiDiagrams.ts', out);
