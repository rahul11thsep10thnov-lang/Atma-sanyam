// Seeds lookup data (states, a starter category tree, tags) plus,
// optionally, a handful of clearly-marked DEVELOPMENT/DEMO exams that
// exercise every relation in the schema end to end.
//
// Real government data is never invented (Section 42) — everything under
// "DEMO" below is fictional placeholder content for local development and
// UI testing only, and is labelled as such in its own title/description so
// it can never be mistaken for a real notification.
//
//   npm run seed:content                  # states, categories, tags only
//   npm run seed:content -- --with-samples  # + demo exam/job/result/etc.
import { prisma } from "./scriptDb";

const STATES: Array<{ name: string; code: string }> = [
  { name: "Andhra Pradesh", code: "AP" },
  { name: "Arunachal Pradesh", code: "AR" },
  { name: "Assam", code: "AS" },
  { name: "Bihar", code: "BR" },
  { name: "Chhattisgarh", code: "CG" },
  { name: "Goa", code: "GA" },
  { name: "Gujarat", code: "GJ" },
  { name: "Haryana", code: "HR" },
  { name: "Himachal Pradesh", code: "HP" },
  { name: "Jharkhand", code: "JH" },
  { name: "Karnataka", code: "KA" },
  { name: "Kerala", code: "KL" },
  { name: "Madhya Pradesh", code: "MP" },
  { name: "Maharashtra", code: "MH" },
  { name: "Manipur", code: "MN" },
  { name: "Meghalaya", code: "ML" },
  { name: "Mizoram", code: "MZ" },
  { name: "Nagaland", code: "NL" },
  { name: "Odisha", code: "OD" },
  { name: "Punjab", code: "PB" },
  { name: "Rajasthan", code: "RJ" },
  { name: "Sikkim", code: "SK" },
  { name: "Tamil Nadu", code: "TN" },
  { name: "Telangana", code: "TG" },
  { name: "Tripura", code: "TR" },
  { name: "Uttar Pradesh", code: "UP" },
  { name: "Uttarakhand", code: "UK" },
  { name: "West Bengal", code: "WB" },
  { name: "Andaman and Nicobar Islands", code: "AN" },
  { name: "Chandigarh", code: "CH" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DN" },
  { name: "Delhi", code: "DL" },
  { name: "Jammu and Kashmir", code: "JK" },
  { name: "Ladakh", code: "LA" },
  { name: "Lakshadweep", code: "LD" },
  { name: "Puducherry", code: "PY" },
  { name: "All India", code: "ALL_INDIA" },
];

const CATEGORIES = [
  "Banking",
  "Railway",
  "SSC",
  "UPSC",
  "State PSC",
  "Police",
  "Teaching",
  "Defence",
];

const TAGS = ["Graduate Level", "12th Pass", "Post Graduate", "Technical", "Non-Technical"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedLookups() {
  for (const state of STATES) {
    await prisma.state.upsert({
      where: { code: state.code },
      update: {},
      create: { name: state.name, code: state.code, slug: slugify(state.name) },
    });
  }
  console.log(`States: ${STATES.length} ensured.`);

  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }
  console.log(`Categories: ${CATEGORIES.length} ensured.`);

  for (const name of TAGS) {
    await prisma.tag.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }
  console.log(`Tags: ${TAGS.length} ensured.`);
}

async function seedDemoExam() {
  const systemAdmin = await prisma.adminUser.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  if (!systemAdmin) {
    console.warn(
      "No SUPER_ADMIN found — run `npm run seed:admin` first if you want demo content attributed to a real admin. Skipping demo samples.",
    );
    return;
  }

  const org = await prisma.organization.upsert({
    where: { slug: "demo-recruitment-board" },
    update: {},
    create: {
      name: "[DEMO] Sample Recruitment Board",
      slug: "demo-recruitment-board",
      description:
        "Fictional organization used only for local development and UI testing. Not a real government body.",
    },
  });

  const category = await prisma.category.findUniqueOrThrow({
    where: { slug: "ssc" },
  });
  const state = await prisma.state.findUniqueOrThrow({
    where: { code: "ALL_INDIA" },
  });

  const exam = await prisma.exam.upsert({
    where: { slug: "demo-clerk-exam-2026" },
    update: {},
    create: {
      title: "[DEMO] Sample Clerk Recruitment Exam 2026",
      slug: "demo-clerk-exam-2026",
      description:
        "DEVELOPMENT/DEMO DATA ONLY — a fictional exam used to exercise the schema. Not a real government notification.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: systemAdmin.id,
      updatedBy: systemAdmin.id,
      organizationId: org.id,
      categoryId: category.id,
      stateId: state.id,
      applicationStartDate: new Date("2026-10-01"),
      applicationEndDate: new Date("2026-10-31"),
      examDate: new Date("2026-12-15"),
    },
  });

  await prisma.job.upsert({
    where: { slug: "demo-clerk-exam-2026-notification" },
    update: {},
    create: {
      title: "[DEMO] Sample Clerk Recruitment Exam 2026 — Notification",
      slug: "demo-clerk-exam-2026-notification",
      description: "DEVELOPMENT/DEMO DATA ONLY.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: systemAdmin.id,
      updatedBy: systemAdmin.id,
      examId: exam.id,
      organizationId: org.id,
      advertisementNumber: "DEMO/2026/001",
      vacancies: 500,
      qualification: "Bachelor's degree from a recognized university",
      ageLimitMin: 18,
      ageLimitMax: 27,
      applicationFee: 500,
      applicationFeeByCategory: { general: 500, obc: 500, sc_st: 0, pwd: 0 },
      officialWebsite: "https://example.org",
      applyUrl: "https://example.org/apply",
      eligibility: "Not specified in the available notification.",
      selectionProcess: ["Prelims", "Mains", "Interview"],
      applicationEndDate: new Date("2026-10-31"),
      seoTitle: "Sample Clerk Recruitment Exam 2026 Notification (Demo)",
      seoDescription:
        "Demo notification page used for local development only.",
      seoKeywords: ["demo", "sample recruitment"],
    },
  });

  const admitCard = await prisma.admitCard.upsert({
    where: { slug: "demo-clerk-exam-2026-admit-card" },
    update: {},
    create: {
      title: "[DEMO] Sample Clerk Recruitment Exam 2026 — Admit Card",
      slug: "demo-clerk-exam-2026-admit-card",
      description: "DEVELOPMENT/DEMO DATA ONLY.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: systemAdmin.id,
      updatedBy: systemAdmin.id,
      examId: exam.id,
      releaseDate: new Date("2026-12-01"),
      examDate: new Date("2026-12-15"),
      downloadUrl: "https://example.org/admit-card",
      officialWebsite: "https://example.org",
      instructions: "Carry a valid photo ID along with the admit card.",
    },
  });

  await prisma.result.upsert({
    where: { slug: "demo-clerk-exam-2026-result" },
    update: {},
    create: {
      title: "[DEMO] Sample Clerk Recruitment Exam 2026 — Result",
      slug: "demo-clerk-exam-2026-result",
      description: "DEVELOPMENT/DEMO DATA ONLY.",
      status: "DRAFT",
      createdBy: systemAdmin.id,
      updatedBy: systemAdmin.id,
      examId: exam.id,
      relatedAdmitCardId: admitCard.id,
      officialWebsite: "https://example.org",
    },
  });

  const syllabus = await prisma.syllabus.upsert({
    where: { slug: "demo-clerk-exam-2026-syllabus" },
    update: {},
    create: {
      title: "[DEMO] Sample Clerk Recruitment Exam 2026 — Syllabus",
      slug: "demo-clerk-exam-2026-syllabus",
      description: "DEVELOPMENT/DEMO DATA ONLY.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: systemAdmin.id,
      updatedBy: systemAdmin.id,
      examId: exam.id,
    },
  });

  const existingPaper = await prisma.syllabusPaper.findFirst({
    where: { syllabusId: syllabus.id, name: "Paper 1" },
  });
  const paper =
    existingPaper ??
    (await prisma.syllabusPaper.create({
      data: { syllabusId: syllabus.id, name: "Paper 1", order: 1 },
    }));

  const existingSubject = await prisma.syllabusSubject.findFirst({
    where: { paperId: paper.id, name: "General Awareness" },
  });
  const subject =
    existingSubject ??
    (await prisma.syllabusSubject.create({
      data: { paperId: paper.id, name: "General Awareness", order: 1 },
    }));

  const existingTopic = await prisma.syllabusTopic.findFirst({
    where: { subjectId: subject.id, name: "Current Affairs" },
  });
  if (!existingTopic) {
    await prisma.syllabusTopic.create({
      data: {
        subjectId: subject.id,
        name: "Current Affairs",
        subtopics: ["National", "International", "Sports"],
        order: 1,
      },
    });
  }

  console.log("Demo exam and related content ensured (org: demo-recruitment-board).");
}

async function main() {
  await seedLookups();
  if (process.argv.includes("--with-samples")) {
    await seedDemoExam();
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
