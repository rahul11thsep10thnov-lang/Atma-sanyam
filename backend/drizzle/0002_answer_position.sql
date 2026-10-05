ALTER TABLE "test_answers" ADD COLUMN "position" integer;
--> statement-breakpoint
UPDATE "test_answers" ta SET "position" = mtq."position"
FROM "test_attempts" att, "mock_test_questions" mtq
WHERE att."id" = ta."attempt_id" AND mtq."mock_test_id" = att."mock_test_id" AND mtq."question_id" = ta."question_id";
