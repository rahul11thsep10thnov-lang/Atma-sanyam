// Pushes the static seed data (src/data/*) into a Supabase project.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (service
// role is needed to bypass RLS for bulk admin writes).
//
// Usage: npm run seed:supabase
import { createClient } from "@supabase/supabase-js";
import { STATES } from "../data/states";
import { SUBJECTS } from "../data/subjects";
import { EXAM_CONFIGS } from "../data/examConfigs";
import { QUESTIONS } from "../data/questions";
import { PYQ_PAPERS } from "../data/pyq";
import { MOCK_TESTS } from "../data/mockTests";
import { STUDY_NOTES } from "../data/studyNotes";
import { CURRENT_AFFAIRS } from "../data/currentAffairs";
import { EXAM_UPDATES } from "../data/examUpdates";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars. Set them (see .env.example) before running the seed script."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function run() {
  console.log("Seeding states...");
  await upsert(
    "states",
    STATES.map((s) => ({
      code: s.code,
      name: s.name,
      hinglish_name: s.hinglishName,
      capital: s.capital,
      formation_year: s.formationYear,
      total_districts: s.totalDistricts,
      high_court: s.highCourt,
      police_board_name: s.policeBoardName,
      police_board_short: s.policeBoardShort,
    }))
  );

  console.log("Seeding subjects...");
  await upsert(
    "subjects",
    SUBJECTS.map((s) => ({ id: s.id, name: s.name, hinglish_name: s.hinglishName }))
  );

  console.log("Seeding exams + exam_configs...");
  for (const cfg of EXAM_CONFIGS) {
    const { data: examRow, error: examErr } = await supabase
      .from("exams")
      .upsert(
        { state_code: cfg.state, exam_type: cfg.exam, slug: cfg.slug, title: cfg.title },
        { onConflict: "slug" }
      )
      .select()
      .single();
    if (examErr || !examRow) {
      console.error("exam upsert failed", cfg.slug, examErr);
      continue;
    }
    await supabase.from("exam_configs").upsert({
      exam_id: examRow.id,
      overview: cfg.overview,
      eligibility: cfg.eligibility,
      age_limit_text: typeof cfg.ageLimit.value === "string" ? cfg.ageLimit.value : null,
      educational_qualification_text:
        typeof cfg.educationalQualification.value === "string"
          ? cfg.educationalQualification.value
          : null,
      vacancy: cfg.vacancy.value,
      vacancy_source_note: cfg.vacancy.sourceNote,
      application_start: cfg.applicationStart.value,
      application_end: cfg.applicationEnd.value,
      exam_date: cfg.examDate.value,
      pattern: cfg.pattern,
      syllabus: cfg.syllabus,
      physical_standards: cfg.physicalStandards,
      physical_efficiency: cfg.physicalEfficiency,
      medical_requirements: cfg.medicalRequirements,
      selection_process: cfg.selectionProcess,
      cutoff_note: cfg.cutoffNote,
      admit_card_note: cfg.admitCardNote,
      result_note: cfg.resultNote,
      official_notification_url: cfg.officialNotificationUrl ?? null,
      last_verified: cfg.lastVerified,
    });
  }

  console.log(`Seeding ${QUESTIONS.length} questions...`);
  await upsert(
    "questions",
    QUESTIONS.map((q) => ({
      id: q.id,
      state_code: q.state,
      exam_type: q.exam,
      subject_id: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      source: q.source,
      year: q.year ?? null,
      language: q.language,
      tags: q.tags,
      status: q.status,
      is_sample: q.isSample,
    })),
    500
  );

  console.log("Seeding question_options...");
  const options = QUESTIONS.flatMap((q) =>
    (["A", "B", "C", "D"] as const).map((key, i) => ({
      question_id: q.id,
      option_key: key,
      option_text: q.options[i],
    }))
  );
  await upsert("question_options", options, 500);

  console.log("Seeding PYQ papers + links...");
  await upsert(
    "pyq_papers",
    PYQ_PAPERS.map((p) => ({
      id: p.id,
      state_code: p.state,
      exam_type: p.exam,
      year: p.year,
      shift: p.shift ?? null,
      title: p.title,
      is_sample: p.isSample,
    }))
  );
  const pyqLinks = PYQ_PAPERS.flatMap((p) =>
    p.questionIds.map((qid, i) => ({ pyq_paper_id: p.id, question_id: qid, position: i }))
  );
  await upsert("pyq_questions", pyqLinks, 500);

  console.log("Seeding mock tests + links...");
  await upsert(
    "mock_tests",
    MOCK_TESTS.map((m) => ({
      id: m.id,
      state_code: m.state,
      exam_type: m.exam,
      title: m.title,
      type: m.type,
      subject_id: m.subject ?? null,
      question_count: m.questionCount,
      duration_minutes: m.durationMinutes,
      marks_per_question: m.marksPerQuestion,
      negative_marks: m.negativeMarks,
    }))
  );
  const mockLinks = MOCK_TESTS.flatMap((m) =>
    m.questionIds.map((qid, i) => ({ mock_test_id: m.id, question_id: qid, position: i }))
  );
  await upsert("mock_questions", mockLinks, 500);

  console.log("Seeding study notes...");
  await upsert(
    "study_notes",
    STUDY_NOTES.map((n) => ({
      id: n.id,
      slug: n.slug,
      title: n.title,
      subject_id: n.subject,
      state_code: n.state ?? null,
      quick_concept: n.quickConcept,
      important_facts: n.importantFacts,
      revision: n.revision,
      practice_question_ids: n.practiceQuestionIds,
    }))
  );

  console.log("Seeding current affairs...");
  await upsert(
    "current_affairs",
    CURRENT_AFFAIRS.map((c) => ({
      id: c.id,
      date: c.date,
      category: c.category,
      state_code: c.state ?? null,
      title: c.title,
      summary: c.summary,
      source: c.source,
    }))
  );

  console.log("Seeding exam updates...");
  await upsert(
    "exam_updates",
    EXAM_UPDATES.map((u) => ({
      id: u.id,
      state_code: u.state,
      exam_type: u.exam,
      type: u.type,
      title: u.title,
      date: u.date,
      status: u.status,
      source: u.source,
      is_sample: u.isSample,
    }))
  );

  console.log("Done.");
}

async function upsert(table: string, rows: Record<string, unknown>[], chunkSize = 200) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) {
      console.error(`Failed to seed ${table} (rows ${i}-${i + chunk.length}):`, error.message);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
