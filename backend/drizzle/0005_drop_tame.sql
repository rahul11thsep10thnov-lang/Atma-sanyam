ALTER TABLE "blocks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "focus_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "friendships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_participants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "otp_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_reset_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pokes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "blocks" CASCADE;--> statement-breakpoint
DROP TABLE "focus_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "friendships" CASCADE;--> statement-breakpoint
DROP TABLE "group_messages" CASCADE;--> statement-breakpoint
DROP TABLE "group_participants" CASCADE;--> statement-breakpoint
DROP TABLE "group_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "otp_codes" CASCADE;--> statement-breakpoint
DROP TABLE "password_reset_codes" CASCADE;--> statement-breakpoint
DROP TABLE "pokes" CASCADE;--> statement-breakpoint
DROP TABLE "user_notifications" CASCADE;--> statement-breakpoint
DROP TABLE "user_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "devices_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "devices_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "events_user_id_idx";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "user_id";