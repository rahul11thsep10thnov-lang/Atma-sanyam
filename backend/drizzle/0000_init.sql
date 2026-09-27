CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('queued', 'generating', 'validating', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'generating', 'validating', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."mock_test_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('ai', 'import', 'manual', 'pyq');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('draft', 'generated', 'validating', 'needs_review', 'approved', 'rejected', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('mcq', 'multiple_select', 'true_false', 'numerical', 'assertion_reason', 'matching', 'passage_based');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('approved', 'needs_review', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reviewer_type" AS ENUM('validator', 'ai', 'human');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('text', 'url', 'syllabus', 'pyq', 'pdf');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"state_code" text,
	"exam_type" text,
	"default_language" text DEFAULT 'hi-Latn' NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"batch_index" integer NOT NULL,
	"requested_count" integer NOT NULL,
	"difficulty_mix" jsonb NOT NULL,
	"status" "batch_status" DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"approved_count" integer DEFAULT 0 NOT NULL,
	"needs_review_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"discarded_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 4) DEFAULT '0' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"exam_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"topic_id" uuid,
	"language" text NOT NULL,
	"question_type" "question_type" DEFAULT 'mcq' NOT NULL,
	"requested_count" integer NOT NULL,
	"batch_size" integer NOT NULL,
	"difficulty_distribution" jsonb NOT NULL,
	"explanation_required" boolean DEFAULT true NOT NULL,
	"source_reference" text,
	"source_material_id" uuid,
	"additional_instructions" text,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"provider" text NOT NULL,
	"generation_model" text NOT NULL,
	"review_model" text NOT NULL,
	"max_cost_usd" numeric(12, 4),
	"estimated_cost_usd" numeric(12, 4) DEFAULT '0' NOT NULL,
	"actual_cost_usd" numeric(12, 4) DEFAULT '0' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"approved_count" integer DEFAULT 0 NOT NULL,
	"needs_review_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"discarded_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"total_questions" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"marks_per_question" numeric(6, 2) DEFAULT '1' NOT NULL,
	"negative_marks" numeric(6, 2) DEFAULT '0' NOT NULL,
	"difficulty_distribution" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_test_questions" (
	"mock_test_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"section_subject_id" uuid,
	CONSTRAINT "mock_test_questions_mock_test_id_question_id_pk" PRIMARY KEY("mock_test_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "mock_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"blueprint_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"language" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"marks_per_question" numeric(6, 2) DEFAULT '1' NOT NULL,
	"negative_marks" numeric(6, 2) DEFAULT '0' NOT NULL,
	"difficulty_distribution" jsonb,
	"status" "mock_test_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"reviewer_type" "reviewer_type" NOT NULL,
	"admin_id" uuid,
	"model" text,
	"decision" "review_decision" NOT NULL,
	"valid" boolean,
	"correct_answer_verified" boolean,
	"explanation_verified" boolean,
	"difficulty_appropriate" boolean,
	"duplicate_probability" real,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"topic_id" uuid,
	"question_text" text NOT NULL,
	"question_type" "question_type" DEFAULT 'mcq' NOT NULL,
	"language" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"explanation" text,
	"correct_option" text NOT NULL,
	"status" "question_status" DEFAULT 'draft' NOT NULL,
	"source" "question_source" NOT NULL,
	"source_name" text,
	"source_reference" text,
	"source_material_id" uuid,
	"source_excerpt" text,
	"valid_as_of" date,
	"computation" text,
	"normalized_text" text NOT NULL,
	"fingerprint" text NOT NULL,
	"duplicate_of_id" uuid,
	"duplicate_score" real,
	"validation_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generation_job_id" uuid,
	"generation_batch_id" uuid,
	"created_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid,
	"subject_id" uuid,
	"kind" "source_kind" NOT NULL,
	"name" text NOT NULL,
	"reference" text,
	"content" text,
	"license_note" text,
	"valid_from" date,
	"valid_to" date,
	"approved" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option" text,
	"is_correct" boolean,
	"marked_for_review" boolean DEFAULT false NOT NULL,
	"time_spent_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mock_test_id" uuid NOT NULL,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"time_taken_seconds" integer,
	"total_questions" integer NOT NULL,
	"attempted_count" integer,
	"correct_count" integer,
	"incorrect_count" integer,
	"unanswered_count" integer,
	"score" numeric(8, 2),
	"max_score" numeric(8, 2),
	"percentage" numeric(6, 2),
	"late" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_provider" text NOT NULL,
	"external_id" text,
	"display_name" text,
	"email" text,
	"phone" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_batches" ADD CONSTRAINT "generation_batches_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_source_material_id_source_materials_id_fk" FOREIGN KEY ("source_material_id") REFERENCES "public"."source_materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_blueprints" ADD CONSTRAINT "mock_blueprints_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_blueprints" ADD CONSTRAINT "mock_blueprints_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD CONSTRAINT "mock_test_questions_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD CONSTRAINT "mock_test_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD CONSTRAINT "mock_test_questions_section_subject_id_subjects_id_fk" FOREIGN KEY ("section_subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_tests" ADD CONSTRAINT "mock_tests_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_tests" ADD CONSTRAINT "mock_tests_blueprint_id_mock_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."mock_blueprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_tests" ADD CONSTRAINT "mock_tests_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reviews" ADD CONSTRAINT "question_reviews_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reviews" ADD CONSTRAINT "question_reviews_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_source_material_id_source_materials_id_fk" FOREIGN KEY ("source_material_id") REFERENCES "public"."source_materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_generation_job_id_generation_jobs_id_fk" FOREIGN KEY ("generation_job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_generation_batch_id_generation_batches_id_fk" FOREIGN KEY ("generation_batch_id") REFERENCES "public"."generation_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_admins_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_materials" ADD CONSTRAINT "source_materials_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_materials" ADD CONSTRAINT "source_materials_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_materials" ADD CONSTRAINT "source_materials_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_uq" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_idx" ON "admin_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_uq" ON "admins" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_subject_slug_uq" ON "chapters" USING btree ("subject_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "exams_slug_uq" ON "exams" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_batches_job_index_uq" ON "generation_batches" USING btree ("job_id","batch_index");--> statement-breakpoint
CREATE INDEX "generation_batches_claim_idx" ON "generation_batches" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_status_idx" ON "generation_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generation_jobs_created_idx" ON "generation_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_test_questions_position_uq" ON "mock_test_questions" USING btree ("mock_test_id","position");--> statement-breakpoint
CREATE INDEX "mock_test_questions_question_idx" ON "mock_test_questions" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "mock_tests_status_idx" ON "mock_tests" USING btree ("status","exam_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_q_label_uq" ON "question_options" USING btree ("question_id","label");--> statement-breakpoint
CREATE INDEX "question_reviews_question_idx" ON "question_reviews" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_status_idx" ON "questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questions_scope_idx" ON "questions" USING btree ("exam_id","subject_id","chapter_id");--> statement-breakpoint
CREATE INDEX "questions_fingerprint_idx" ON "questions" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "questions_job_idx" ON "questions" USING btree ("generation_job_id");--> statement-breakpoint
CREATE INDEX "questions_published_pick_idx" ON "questions" USING btree ("exam_id","language","status","difficulty");--> statement-breakpoint
CREATE INDEX "source_materials_exam_idx" ON "source_materials" USING btree ("exam_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_exam_slug_uq" ON "subjects" USING btree ("exam_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "test_answers_attempt_question_uq" ON "test_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "test_answers_question_idx" ON "test_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "test_attempts_user_idx" ON "test_attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "test_attempts_mock_idx" ON "test_attempts" USING btree ("mock_test_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_chapter_slug_uq" ON "topics" USING btree ("chapter_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_token_uq" ON "user_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_provider_external_uq" ON "users" USING btree ("auth_provider","external_id");