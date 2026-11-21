CREATE TABLE "abuse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"user_id" uuid,
	"device_hash" text,
	"network_hash" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "device_hash" text;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "network_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "network_hash" text;--> statement-breakpoint
ALTER TABLE "abuse_events" ADD CONSTRAINT "abuse_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abuse_events_created_idx" ON "abuse_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "abuse_events_kind_idx" ON "abuse_events" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "test_attempts_device_idx" ON "test_attempts" USING btree ("device_hash","started_at");--> statement-breakpoint
CREATE INDEX "test_attempts_network_idx" ON "test_attempts" USING btree ("network_hash","started_at");--> statement-breakpoint
CREATE INDEX "users_device_hash_idx" ON "users" USING btree ("device_hash","created_at");--> statement-breakpoint
CREATE INDEX "users_network_hash_idx" ON "users" USING btree ("network_hash","created_at");