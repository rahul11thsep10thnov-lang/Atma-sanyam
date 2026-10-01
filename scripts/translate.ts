/**
 * Translation tooling for guide text (see lib/master/translation).
 *
 *   npm run translate -- report
 *   npm run translate -- export --lang hi [--dest varanasi] [--limit 60]     prints untranslated sentences as JSON
 *   npm run translate -- import --lang hi batch.json                         merges { "English": "translation" }
 *   npm run translate -- auto --lang hi,ta [--dest varanasi] [--limit 200]   translates with Claude (needs ANTHROPIC_API_KEY)
 *
 * Every translation — from a file or from the model — must pass the faithfulness check (numbers, prices,
 * times and the {name} placeholder unchanged) or it is rejected and reported, never stored.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../lib/master/repo";
import { checkFaithful } from "../lib/master/translation/faithful";
import { coverageReport, orphanStrings, untranslated } from "../lib/master/translation/todo";

const LANGS: Record<string, string> = {
  hi: "Hindi (Devanagari)", bn: "Bengali", mr: "Marathi (Devanagari)", ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam"
};
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const fileFor = (lang: string) => join(__dirname, "..", "data", "translations", `${lang}.json`);

function merge(lang: string, entries: Record<string, string>) {
  const file = JSON.parse(readFileSync(fileFor(lang), "utf8"));
  const rejected: Array<{ en: string; problems: string[] }> = [];
  let added = 0;
  for (const [en, tr] of Object.entries(entries)) {
    const check = checkFaithful(en, tr);
    if (!check.ok) rejected.push({ en: en.slice(0, 80), problems: check.problems });
    else {
      file.strings[en] = tr;
      added++;
    }
  }
  file.strings = Object.fromEntries(Object.entries(file.strings).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(fileFor(lang), `${JSON.stringify(file, null, 1)}\n`);
  return { added, rejected };
}

const SYSTEM = (language: string) => `You translate text for an Indian travel-guide website into ${language}.
Rules:
- Translate faithfully and naturally. Do not add, remove or soften any fact, and add no advice, superlatives or claims.
- Keep every number exactly as written, using Western digits 0-9 (prices, times such as 06:00, years, distances, ranges). Keep the ₹ sign. Never turn digits into words.
- Keep the placeholder {name} exactly as it is; it is replaced by the place name later.
- Keep framing words such as "According to…", "tradition", "legend", "believed" — never state a tradition as plain fact.
- Keep proper names of people, temples, dynasties and books in common transliteration; keep abbreviations like CE, BCE, km, h.
- Return ONLY a JSON object mapping each input sentence (exactly as given) to its translation.`;

async function auto(lang: string, only: string | undefined, limit: number) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set — use export/import for hand-reviewed translations instead.");
  const client = new Anthropic();
  const todo = untranslated(getDb(), lang, only).slice(0, limit);
  console.log(`${lang}: translating ${todo.length} sentences with Claude`);
  let added = 0;
  const rejected: Array<{ en: string; problems: string[] }> = [];
  for (let i = 0; i < todo.length; i += 25) {
    const batch = todo.slice(i, i + 25).map((s) => s.text);
    const res = await client.messages.create({
      model: process.env.AI_MODEL ?? "claude-opus-5-5",
      max_tokens: 8000,
      system: SYSTEM(LANGS[lang]),
      messages: [{ role: "user", content: JSON.stringify(batch) }]
    });
    const block = res.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "{}";
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    } catch {
      console.warn(`batch ${i / 25 + 1}: unparseable response, skipped`);
      continue;
    }
    const entries = Object.fromEntries(Object.entries(parsed).filter(([en]) => batch.includes(en)));
    const r = merge(lang, entries);
    added += r.added;
    rejected.push(...r.rejected);
  }
  console.log(`${lang}: stored ${added}, rejected ${rejected.length}`);
  rejected.slice(0, 10).forEach((r) => console.log("  rejected:", r.en, "—", r.problems.join("; ")));
}

async function main() {
  const cmd = process.argv[2];
  const lang = arg("lang");
  if (cmd === "report") {
    for (const l of Object.keys(LANGS)) console.log(JSON.stringify({ ...coverageReport(getDb(), l), stale: orphanStrings(getDb(), l).length }));
  } else if (cmd === "export" && lang) {
    const items = untranslated(getDb(), lang, arg("dest")).slice(0, Number(arg("limit") ?? 60));
    console.log(JSON.stringify(items.map((s) => s.text), null, 1));
  } else if (cmd === "import" && lang) {
    const path = process.argv[process.argv.indexOf("--lang") + 2];
    const r = merge(lang, JSON.parse(readFileSync(path, "utf8")));
    console.log(`${lang}: stored ${r.added}, rejected ${r.rejected.length}`);
    r.rejected.forEach((x) => console.log("  rejected:", x.en, "—", x.problems.join("; ")));
    if (r.rejected.length) process.exitCode = 1;
  } else if (cmd === "auto" && lang) {
    for (const l of lang.split(",")) await auto(l.trim(), arg("dest"), Number(arg("limit") ?? 100000));
  } else {
    console.error("usage: translate report | export --lang hi | import --lang hi file.json | auto --lang hi,ta");
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
