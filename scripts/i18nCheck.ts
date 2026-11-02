// Lists English UI strings that have no Hindi translation yet.
//   npm run i18n:missing            print them, grouped by prefix
//   npm run i18n:missing -- --write refresh tests/i18n-hi-baseline.json (shrink it as you translate)
import { writeFileSync } from 'node:fs';
import { en } from '../src/i18n/strings/en.ts';
import { hi } from '../src/i18n/strings/hi.ts';

const enKeys = Object.keys(en);
const missing = enKeys.filter((k) => !((hi as Record<string, string>)[k]?.trim()));
const byPrefix = new Map<string, string[]>();
for (const k of missing) {
  const p = k.split('.')[0]!;
  byPrefix.set(p, [...(byPrefix.get(p) ?? []), k]);
}
console.log(`Hindi covers ${enKeys.length - missing.length} of ${enKeys.length} strings (${Math.round(((enKeys.length - missing.length) / enKeys.length) * 100)}%). ${missing.length} still fall back to English.\n`);
for (const [p, keys] of [...byPrefix].sort((a, b) => b[1].length - a[1].length)) console.log(`${p.padEnd(12)} ${keys.length}`);
if (process.argv.includes('--write')) {
  writeFileSync(new URL('../tests/i18n-hi-baseline.json', import.meta.url), JSON.stringify(missing, null, 1) + '\n');
  console.log('\nBaseline written to tests/i18n-hi-baseline.json');
}
