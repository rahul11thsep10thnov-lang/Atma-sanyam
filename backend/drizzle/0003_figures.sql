ALTER TYPE "public"."question_source" ADD VALUE 'figure';--> statement-breakpoint
ALTER TABLE "question_options" ADD COLUMN "svg" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "figure_svg" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "figure_kind" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "figure_params" jsonb;