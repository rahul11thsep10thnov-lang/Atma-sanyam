ALTER TABLE "questions" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "topic_label" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "subtopic" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "concept" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "cognitive_level" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "variation_allowed" boolean;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "variation_rule" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "difficulty_label" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "answer_verified" boolean;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "ai_verified" boolean;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "verification_method" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "qa_grade" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "qa_flags" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "qa_fixes" text;--> statement-breakpoint
CREATE INDEX "questions_external_id_idx" ON "questions" USING btree ("exam_id","external_id");--> statement-breakpoint
CREATE INDEX "questions_qa_grade_idx" ON "questions" USING btree ("qa_grade");