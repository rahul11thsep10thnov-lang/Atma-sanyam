CREATE TABLE "user_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"reported_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"context" text,
	"group_session_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution_note" text,
	CONSTRAINT "user_reports_status_check" CHECK ("user_reports"."status" in ('open', 'resolved', 'dismissed')),
	CONSTRAINT "user_reports_reason_check" CHECK ("user_reports"."reason" in ('harassment', 'inappropriate_profile', 'spam', 'impersonation', 'other')),
	CONSTRAINT "user_reports_note_length_check" CHECK (char_length("user_reports"."note") <= 500)
);
--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_id_users_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_group_session_id_group_sessions_id_fk" FOREIGN KEY ("group_session_id") REFERENCES "public"."group_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_resolved_by_admins_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_reports_status_idx" ON "user_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "user_reports_reported_idx" ON "user_reports" USING btree ("reported_id","created_at");--> statement-breakpoint
CREATE INDEX "user_reports_reporter_idx" ON "user_reports" USING btree ("reporter_id","reported_id","created_at");