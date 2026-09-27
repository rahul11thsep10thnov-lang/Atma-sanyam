// Exports the website's exam taxonomy (and its sample questions) as JSON seed
// files for the API in /backend, so both use the same exams/subjects/chapters.
// Run with: npx tsx src/scripts/export-backend-seed.ts
// Output: backend/seed/taxonomy.json, backend/seed/sample-questions.json
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { STATES } from "../data/states";
import { SUBJECT_MAP } from "../data/subjects";
import { QUESTIONS, getSubjectsForProfile } from "../data/questions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../../backend/seed");

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Syllabus chapters that have no sample questions yet but belong in the
// taxonomy so admins can generate for them straight away.
const EXTRA_CHAPTERS: Record<string, string[]> = {
  maths: ["Percentage", "Average", "Profit-Loss", "Simplification", "Time-Speed-Distance", "Ratio", "Simple Interest", "Number System", "Time and Work"],
  reasoning: ["Series", "Coding-Decoding", "Blood Relation", "Direction Sense", "Analogy", "Odd One Out", "Syllogism"],
  hindi: ["Sandhi", "Samas", "Muhavare", "Paryayvachi", "Vilom Shabd", "Vyakaran"],
  gk: ["India GK", "Sports", "Awards", "Static GK"],
  "current-affairs": ["National", "State", "International", "Sports"],
  "police-law": ["Basics", "Police Administration"],
};

const BASE_SUBJECTS = {
  constable: ["gk", "current-affairs", "hindi", "maths", "reasoning", "state-gk", "police-law"],
  si: ["gk", "current-affairs", "hindi", "maths", "reasoning", "state-gk", "science", "polity", "police-law"],
} as const;

const chaptersBySubject = new Map<string, Set<string>>();
for (const q of QUESTIONS) {
  const set = chaptersBySubject.get(q.subject) ?? new Set<string>();
  set.add(q.topic);
  chaptersBySubject.set(q.subject, set);
}
for (const [subject, extra] of Object.entries(EXTRA_CHAPTERS)) {
  const set = chaptersBySubject.get(subject) ?? new Set<string>();
  extra.forEach((c) => set.add(c));
  chaptersBySubject.set(subject, set);
}

const exams = STATES.flatMap((state) =>
  (["constable", "si"] as const).map((exam) => {
    const subjectIds = [...new Set([...BASE_SUBJECTS[exam], ...getSubjectsForProfile(state.code, exam)])];
    return {
      slug: `${state.code}-police-${exam === "si" ? "si" : "constable"}`,
      name: `${state.hinglishName} Police ${exam === "si" ? "Sub-Inspector" : "Constable"}`,
      stateCode: state.code,
      examType: exam,
      defaultLanguage: "hi-Latn",
      subjects: subjectIds.map((id, i) => ({
        slug: id,
        name: id === "state-gk" ? `${state.hinglishName} GK` : (SUBJECT_MAP[id]?.name ?? id),
        sortOrder: i,
        chapters: [...(chaptersBySubject.get(id) ?? new Set(["General"]))].map((name, j) => ({
          slug: slugify(name),
          name,
          sortOrder: j,
        })),
      })),
    };
  })
);

const sampleQuestions = QUESTIONS.map((q) => ({
  exam: `${q.state}-police-${q.exam === "si" ? "si" : "constable"}`,
  subject: q.subject,
  chapter: slugify(q.topic),
  question: q.question,
  options: q.options,
  correct_option: "ABCD"[q.correctAnswer],
  explanation: q.explanation,
  difficulty: q.difficulty === "moderate" ? "medium" : "easy",
  language: "hi-Latn",
  source_name: q.source,
}));

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "taxonomy.json"), JSON.stringify({ exams }, null, 2) + "\n");
writeFileSync(join(OUT, "sample-questions.json"), JSON.stringify(sampleQuestions, null, 2) + "\n");
console.log(`Wrote ${exams.length} exams and ${sampleQuestions.length} sample questions to ${OUT}`);
