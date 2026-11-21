ALTER TYPE "public"."attempt_status" ADD VALUE 'auto_submitted';--> statement-breakpoint
CREATE TABLE "question_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by" uuid,
	"change_kind" text NOT NULL,
	"change_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_answers" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_answers" ADD COLUMN "saved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "test_answers" ADD COLUMN "correct_option_snapshot" text;--> statement-breakpoint
ALTER TABLE "test_answers" ADD COLUMN "question_version" integer;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "last_saved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_changed_by_admins_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_revisions_q_version_uq" ON "question_revisions" USING btree ("question_id","version");--> statement-breakpoint
-- Data safety before the "one open attempt" index: if a race ever created two
-- open attempts for the same user and test, keep the newest open and close the
-- older ones (scored as unanswered, marked late), as the API already does for
-- expired attempts. No rows are deleted.
UPDATE "test_attempts" t SET "status" = 'submitted', "submitted_at" = t."deadline_at", "late" = true,
  "attempted_count" = 0, "correct_count" = 0, "incorrect_count" = 0, "unanswered_count" = t."total_questions",
  "score" = '0.00', "percentage" = '0.00',
  "max_score" = (SELECT (t."total_questions" * m."marks_per_question")::numeric(8,2) FROM "mock_tests" m WHERE m."id" = t."mock_test_id")
WHERE t."status" = 'in_progress' AND EXISTS (
  SELECT 1 FROM "test_attempts" n
  WHERE n."user_id" = t."user_id" AND n."mock_test_id" = t."mock_test_id" AND n."status" = 'in_progress'
    AND (n."started_at" > t."started_at" OR (n."started_at" = t."started_at" AND n."id" > t."id"))
);--> statement-breakpoint
-- Open attempts started before this migration: snapshot the answer key now.
UPDATE "test_answers" a SET "correct_option_snapshot" = q."correct_option", "question_version" = 1
FROM "questions" q, "test_attempts" t
WHERE q."id" = a."question_id" AND t."id" = a."attempt_id" AND t."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "test_attempts_one_open_uq" ON "test_attempts" USING btree ("user_id","mock_test_id") WHERE status = 'in_progress';