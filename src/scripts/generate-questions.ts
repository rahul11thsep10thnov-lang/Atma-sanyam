// One-off generator: combines state-specific facts + generic subject
// questions into the 9 states × 2 exams × 20 questions sample question bank.
// Run with: npx tsx src/scripts/generate-questions.ts
// Output: src/data/generated/questions.json (checked in; re-run if source
// fact/question banks change).
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { STATE_FACTS, StateFact } from "../data/stateFacts";
import { GENERIC_QUESTIONS, GenericQuestion } from "../data/genericQuestions";
import { STATES } from "../data/states";

const __dirname = dirname(fileURLToPath(import.meta.url));

type ExamType = "constable" | "si";
type StateCode = (typeof STATES)[number]["code"];

interface OutQuestion {
  id: string;
  state: StateCode;
  exam: ExamType;
  subject: string;
  topic: string;
  difficulty: "easy" | "moderate";
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
  source: string;
  language: "hinglish";
  tags: string[];
  status: "published";
  isSample: true;
}

// Deterministic seeded shuffle so re-running the generator is reproducible.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STATE_GK_SUBJECT = "state-gk";

function buildQuestionsForState(state: StateCode, stateIndex: number): OutQuestion[] {
  const facts: StateFact[] = STATE_FACTS[state];
  const constableFacts = facts.slice(0, 8);
  const siFacts = facts.slice(8, 16);

  const shuffledGeneric = seededShuffle(GENERIC_QUESTIONS, stateIndex + 7);
  const constableGeneric = shuffledGeneric.slice(0, 12);
  const siGeneric = shuffledGeneric.slice(12, 24);

  const out: OutQuestion[] = [];
  let seq = 1;

  const stateUpper = state.toUpperCase();

  function pushFact(exam: ExamType, fact: StateFact, idx: number) {
    const difficulty: "easy" | "moderate" = idx % 3 === 2 ? "moderate" : "easy";
    out.push({
      id: `${stateUpper}-${exam.toUpperCase()}-SGK-${String(seq).padStart(3, "0")}`,
      state,
      exam,
      subject: STATE_GK_SUBJECT,
      topic: fact.topic,
      difficulty,
      question: fact.question,
      options: fact.options,
      correctAnswer: fact.correctAnswer,
      explanation: fact.explanation,
      source: "Standard state GK reference (sample/demo content)",
      language: "hinglish",
      tags: [state, "state-gk", fact.topic.toLowerCase()],
      status: "published",
      isSample: true,
    });
    seq++;
  }

  function pushGeneric(exam: ExamType, q: GenericQuestion) {
    out.push({
      id: `${stateUpper}-${exam.toUpperCase()}-${q.subject.toUpperCase()}-${String(seq).padStart(3, "0")}`,
      state,
      exam,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      source: "Standard reference material (sample/demo content)",
      language: "hinglish",
      tags: [state, q.subject, q.topic.toLowerCase()],
      status: "published",
      isSample: true,
    });
    seq++;
  }

  constableFacts.forEach((f, i) => pushFact("constable", f, i));
  constableGeneric.forEach((q) => pushGeneric("constable", q));
  seq = 1;
  siFacts.forEach((f, i) => pushFact("si", f, i));
  siGeneric.forEach((q) => pushGeneric("si", q));

  return out;
}

const all: OutQuestion[] = STATES.flatMap((s, i) => buildQuestionsForState(s.code, i));

const outDir = join(__dirname, "..", "data", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "questions.json"), JSON.stringify(all, null, 2));

const easy = all.filter((q) => q.difficulty === "easy").length;
const moderate = all.filter((q) => q.difficulty === "moderate").length;
console.log(`Generated ${all.length} questions (expected 360).`);
console.log(`Easy: ${easy} (${((easy / all.length) * 100).toFixed(1)}%), Moderate: ${moderate} (${((moderate / all.length) * 100).toFixed(1)}%)`);

const perProfile = new Map<string, number>();
for (const q of all) {
  const key = `${q.state}-${q.exam}`;
  perProfile.set(key, (perProfile.get(key) ?? 0) + 1);
}
for (const [key, count] of perProfile) {
  if (count !== 20) console.warn(`WARNING: ${key} has ${count} questions, expected 20`);
}
