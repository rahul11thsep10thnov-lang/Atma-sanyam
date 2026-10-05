import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums. Values are lowercase in the database; the API and console display
// them uppercase (e.g. NEEDS_REVIEW) where the product spec asks for it.
// ---------------------------------------------------------------------------

export const questionStatus = pgEnum('question_status', [
  'draft',
  'generated',
  'validating',
  'needs_review',
  'approved',
  'rejected',
  'published',
  'archived',
]);

// MCQ is fully implemented; the others are accepted by the schema so the
// data model does not need a migration when they are added.
export const questionType = pgEnum('question_type', [
  'mcq',
  'multiple_select',
  'true_false',
  'numerical',
  'assertion_reason',
  'matching',
  'passage_based',
]);

export const difficulty = pgEnum('difficulty', ['easy', 'medium', 'hard']);

// 'figure' = non-verbal questions drawn by the figure engine (src/figures),
// whose answers are computed, not written by an AI.
export const questionSource = pgEnum('question_source', ['ai', 'import', 'manual', 'pyq', 'figure']);

export const recordStatus = pgEnum('record_status', ['active', 'archived']);

export const jobStatus = pgEnum('job_status', ['queued', 'generating', 'validating', 'completed', 'failed', 'cancelled']);

export const batchStatus = pgEnum('batch_status', ['queued', 'generating', 'validating', 'completed', 'failed', 'cancelled']);

export const reviewerType = pgEnum('reviewer_type', ['validator', 'ai', 'human']);

export const reviewDecision = pgEnum('review_decision', ['approved', 'needs_review', 'rejected']);

export const mockTestStatus = pgEnum('mock_test_status', ['draft', 'published', 'archived']);

// Full-paper tests and subject-wise tests have separate free quotas
// (see services/enrollmentService.ts).
export const mockTestKind = pgEnum('mock_test_kind', ['full', 'subject']);

export const subscriptionStatus = pgEnum('subscription_status', ['pending', 'active', 'expired', 'cancelled']);

export const attemptStatus = pgEnum('attempt_status', ['in_progress', 'submitted']);

export const sourceKind = pgEnum('source_kind', ['text', 'url', 'syllabus', 'pyq', 'pdf']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** Website users. `guest` users get an API-issued token; `supabase` users
 * exchange a verified Supabase access token for one (same Google/OTP login
 * the website already uses). */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authProvider: text('auth_provider').notNull(), // 'guest' | 'supabase'
    externalId: text('external_id'), // Supabase auth user id
    displayName: text('display_name'),
    email: text('email'),
    phone: text('phone'),
    status: recordStatus('status').notNull().default('active'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_provider_external_uq').on(t.authProvider, t.externalId)]
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('user_sessions_token_uq').on(t.tokenHash), index('user_sessions_user_idx').on(t.userId)]
);

/** Console operators. Separate from `users` on purpose: an admin account is
 * never a website account, and it has its own password + session. */
export const admins = pgTable(
  'admins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull(), // see auth/roles.ts
    status: recordStatus('status').notNull().default('active'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('admins_email_uq').on(sql`lower(${t.email})`)]
);

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('admin_sessions_token_uq').on(t.tokenHash), index('admin_sessions_admin_idx').on(t.adminId)]
);

// ---------------------------------------------------------------------------
// Taxonomy: exam → subject → chapter → topic
// ---------------------------------------------------------------------------

export const exams = pgTable(
  'exams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // Optional links back to the website's state/exam profile (e.g. up / constable).
    stateCode: text('state_code'),
    examType: text('exam_type'),
    defaultLanguage: text('default_language').notNull().default('hi-Latn'),
    status: recordStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [uniqueIndex('exams_slug_uq').on(t.slug)]
);

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    status: recordStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [uniqueIndex('subjects_exam_slug_uq').on(t.examId, t.slug)]
);

export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    status: recordStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [uniqueIndex('chapters_subject_slug_uq').on(t.subjectId, t.slug)]
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    status: recordStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [uniqueIndex('topics_chapter_slug_uq').on(t.chapterId, t.slug)]
);

// ---------------------------------------------------------------------------
// Source material (syllabus, reference text, PYQ papers) used to ground
// factual generation. Only `approved` material is ever sent to the AI.
// ---------------------------------------------------------------------------

export const sourceMaterials = pgTable(
  'source_materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examId: uuid('exam_id').references(() => exams.id, { onDelete: 'set null' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    kind: sourceKind('kind').notNull(),
    name: text('name').notNull(),
    reference: text('reference'), // URL, book + edition, notification number…
    content: text('content'), // the text actually given to the generator
    licenseNote: text('license_note'),
    // For current affairs / changing facts: the period the content describes.
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
    approved: boolean('approved').notNull().default(false),
    createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('source_materials_exam_idx').on(t.examId)]
);

// ---------------------------------------------------------------------------
// Generation pipeline
// ---------------------------------------------------------------------------

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export const generationJobs = pgTable(
  'generation_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'restrict' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'restrict' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'restrict' }),
    language: text('language').notNull(),
    questionType: questionType('question_type').notNull().default('mcq'),
    requestedCount: integer('requested_count').notNull(),
    batchSize: integer('batch_size').notNull(),
    difficultyDistribution: jsonb('difficulty_distribution').$type<DifficultyDistribution>().notNull(),
    explanationRequired: boolean('explanation_required').notNull().default(true),
    sourceReference: text('source_reference'),
    sourceMaterialId: uuid('source_material_id').references(() => sourceMaterials.id, { onDelete: 'set null' }),
    additionalInstructions: text('additional_instructions'),
    status: jobStatus('status').notNull().default('queued'),
    provider: text('provider').notNull(), // 'anthropic' | 'mock'
    generationModel: text('generation_model').notNull(),
    reviewModel: text('review_model').notNull(),
    maxCostUsd: numeric('max_cost_usd', { precision: 12, scale: 4 }),
    estimatedCostUsd: numeric('estimated_cost_usd', { precision: 12, scale: 4 }).notNull().default('0'),
    actualCostUsd: numeric('actual_cost_usd', { precision: 12, scale: 4 }).notNull().default('0'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    generatedCount: integer('generated_count').notNull().default(0),
    approvedCount: integer('approved_count').notNull().default(0),
    needsReviewCount: integer('needs_review_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    discardedCount: integer('discarded_count').notNull().default(0),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('generation_jobs_status_idx').on(t.status), index('generation_jobs_created_idx').on(t.createdAt)]
);

export const generationBatches = pgTable(
  'generation_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => generationJobs.id, { onDelete: 'cascade' }),
    batchIndex: integer('batch_index').notNull(),
    requestedCount: integer('requested_count').notNull(),
    difficultyMix: jsonb('difficulty_mix').$type<DifficultyDistribution>().notNull(),
    status: batchStatus('status').notNull().default('queued'),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by'),
    generatedCount: integer('generated_count').notNull().default(0),
    approvedCount: integer('approved_count').notNull().default(0),
    needsReviewCount: integer('needs_review_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    discardedCount: integer('discarded_count').notNull().default(0),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 12, scale: 4 }).notNull().default('0'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('generation_batches_job_index_uq').on(t.jobId, t.batchIndex),
    index('generation_batches_claim_idx').on(t.status, t.nextAttemptAt),
  ]
);

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'restrict' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'restrict' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'restrict' }),
    questionText: text('question_text').notNull(),
    questionType: questionType('question_type').notNull().default('mcq'),
    language: text('language').notNull(),
    difficulty: difficulty('difficulty').notNull(),
    explanation: text('explanation'),
    // Option label (e.g. "B"). For future multi-select types: "A,C".
    correctOption: text('correct_option').notNull(),
    status: questionStatus('status').notNull().default('draft'),
    source: questionSource('source').notNull(),
    sourceName: text('source_name'),
    sourceReference: text('source_reference'),
    sourceMaterialId: uuid('source_material_id').references(() => sourceMaterials.id, { onDelete: 'set null' }),
    sourceExcerpt: text('source_excerpt'),
    // For current affairs / changing facts: "correct as of" date.
    validAsOf: date('valid_as_of'),
    // Arithmetic expression whose value is the correct answer (numerical
    // questions); re-checked programmatically by the validator.
    computation: text('computation'),
    // Non-verbal questions: the problem figure as SVG produced by the figure
    // engine (never user-supplied), the generator id and the seed/params
    // that re-create it exactly.
    figureSvg: text('figure_svg'),
    figureKind: text('figure_kind'),
    figureParams: jsonb('figure_params').$type<Record<string, unknown>>(),
    normalizedText: text('normalized_text').notNull(),
    fingerprint: text('fingerprint').notNull(),
    duplicateOfId: uuid('duplicate_of_id'),
    duplicateScore: real('duplicate_score'),
    validationIssues: jsonb('validation_issues').$type<ValidationIssue[]>().notNull().default([]),
    generationJobId: uuid('generation_job_id').references(() => generationJobs.id, { onDelete: 'set null' }),
    generationBatchId: uuid('generation_batch_id').references(() => generationBatches.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
    reviewedBy: uuid('reviewed_by').references(() => admins.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('questions_status_idx').on(t.status),
    index('questions_scope_idx').on(t.examId, t.subjectId, t.chapterId),
    index('questions_fingerprint_idx').on(t.fingerprint),
    index('questions_job_idx').on(t.generationJobId),
    index('questions_published_pick_idx').on(t.examId, t.language, t.status, t.difficulty),
  ]
);

export const questionOptions = pgTable(
  'question_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    label: text('label').notNull(), // A, B, C, D
    text: text('text').notNull(),
    // Option figure (SVG from the figure engine) for non-verbal questions.
    svg: text('svg'),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [uniqueIndex('question_options_q_label_uq').on(t.questionId, t.label)]
);

export const questionReviews = pgTable(
  'question_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    reviewerType: reviewerType('reviewer_type').notNull(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    model: text('model'),
    decision: reviewDecision('decision').notNull(),
    valid: boolean('valid'),
    correctAnswerVerified: boolean('correct_answer_verified'),
    explanationVerified: boolean('explanation_verified'),
    difficultyAppropriate: boolean('difficulty_appropriate'),
    duplicateProbability: real('duplicate_probability'),
    issues: jsonb('issues').$type<ValidationIssue[] | string[]>().notNull().default([]),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('question_reviews_question_idx').on(t.questionId)]
);

// ---------------------------------------------------------------------------
// Mock tests
// ---------------------------------------------------------------------------

export interface BlueprintSection {
  subjectId: string;
  count: number;
  // Optional: chapterId → number of questions within this section.
  chapters?: Record<string, number>;
}

export const mockBlueprints = pgTable('mock_blueprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  language: text('language').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  marksPerQuestion: numeric('marks_per_question', { precision: 6, scale: 2 }).notNull().default('1'),
  negativeMarks: numeric('negative_marks', { precision: 6, scale: 2 }).notNull().default('0'),
  difficultyDistribution: jsonb('difficulty_distribution').$type<DifficultyDistribution>().notNull(),
  sections: jsonb('sections').$type<BlueprintSection[]>().notNull(),
  status: recordStatus('status').notNull().default('active'),
  createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const mockTests = pgTable(
  'mock_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'restrict' }),
    blueprintId: uuid('blueprint_id').references(() => mockBlueprints.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    language: text('language').notNull(),
    kind: mockTestKind('kind').notNull().default('full'),
    durationMinutes: integer('duration_minutes').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    marksPerQuestion: numeric('marks_per_question', { precision: 6, scale: 2 }).notNull().default('1'),
    negativeMarks: numeric('negative_marks', { precision: 6, scale: 2 }).notNull().default('0'),
    difficultyDistribution: jsonb('difficulty_distribution').$type<DifficultyDistribution>(),
    status: mockTestStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('mock_tests_status_idx').on(t.status, t.examId)]
);

export const mockTestQuestions = pgTable(
  'mock_test_questions',
  {
    mockTestId: uuid('mock_test_id')
      .notNull()
      .references(() => mockTests.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    sectionSubjectId: uuid('section_subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.mockTestId, t.questionId] }),
    uniqueIndex('mock_test_questions_position_uq').on(t.mockTestId, t.position),
    index('mock_test_questions_question_idx').on(t.questionId),
  ]
);

// ---------------------------------------------------------------------------
// Attempts (scored on the server, never trusted from the client)
// ---------------------------------------------------------------------------

export const testAttempts = pgTable(
  'test_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mockTestId: uuid('mock_test_id')
      .notNull()
      .references(() => mockTests.id, { onDelete: 'cascade' }),
    status: attemptStatus('status').notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    timeTakenSeconds: integer('time_taken_seconds'),
    totalQuestions: integer('total_questions').notNull(),
    attemptedCount: integer('attempted_count'),
    correctCount: integer('correct_count'),
    incorrectCount: integer('incorrect_count'),
    unansweredCount: integer('unanswered_count'),
    score: numeric('score', { precision: 8, scale: 2 }),
    maxScore: numeric('max_score', { precision: 8, scale: 2 }),
    percentage: numeric('percentage', { precision: 6, scale: 2 }),
    // True when the answers arrived after the deadline + grace period.
    late: boolean('late').notNull().default(false),
  },
  (t) => [
    index('test_attempts_user_idx').on(t.userId, t.startedAt),
    index('test_attempts_mock_idx').on(t.mockTestId, t.status),
  ]
);

export const testAnswers = pgTable(
  'test_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => testAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    // Question number at the time the attempt started. Keeps old results in
    // order even if the question is later swapped out of the test.
    position: integer('position'),
    selectedOption: text('selected_option'),
    isCorrect: boolean('is_correct'),
    markedForReview: boolean('marked_for_review').notNull().default(false),
    timeSpentSeconds: integer('time_spent_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('test_answers_attempt_question_uq').on(t.attemptId, t.questionId),
    index('test_answers_question_idx').on(t.questionId),
  ]
);

// ---------------------------------------------------------------------------
// Enrolment: one paid plan (yearly). Free quotas are counted from attempts;
// an active subscription row lifts them. Payment details stay with the
// provider — only its order/payment ids are stored here.
// ---------------------------------------------------------------------------

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plan: text('plan').notNull().default('yearly'),
    status: subscriptionStatus('status').notNull().default('pending'),
    amountInr: integer('amount_inr').notNull(),
    listPriceInr: integer('list_price_inr'),
    provider: text('provider').notNull(), // 'razorpay' | 'dev' | 'manual'
    providerOrderId: text('provider_order_id'),
    providerPaymentId: text('provider_payment_id'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    grantedBy: uuid('granted_by').references(() => admins.id, { onDelete: 'set null' }),
    note: text('note'),
    ...timestamps,
  },
  (t) => [index('subscriptions_user_idx').on(t.userId, t.status), uniqueIndex('subscriptions_order_uq').on(t.providerOrderId)]
);

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    actor: text('actor').notNull(), // 'admin' | 'system'
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    details: jsonb('details').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_created_idx').on(t.createdAt), index('audit_logs_entity_idx').on(t.entityType, t.entityId)]
);

/** Admin-editable pipeline settings (batch size, retries, budget…). Values
 * here override the env defaults; see services/settingsService.ts. */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
