ALTER TABLE "game_sessions" ADD COLUMN "seed" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "bracket" text;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "verification" text;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "verification_note" text;