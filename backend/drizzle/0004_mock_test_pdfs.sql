CREATE TYPE "public"."pdf_variant" AS ENUM('paper', 'key', 'both');--> statement-breakpoint
CREATE TABLE "mock_test_pdfs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mock_test_id" uuid NOT NULL,
	"variant" "pdf_variant" NOT NULL,
	"show_details" boolean DEFAULT true NOT NULL,
	"file_name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"pages" integer NOT NULL,
	"sha256" text NOT NULL,
	"content_hash" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_test_pdfs" ADD CONSTRAINT "mock_test_pdfs_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_pdfs" ADD CONSTRAINT "mock_test_pdfs_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mock_test_pdfs_test_idx" ON "mock_test_pdfs" USING btree ("mock_test_id","created_at");