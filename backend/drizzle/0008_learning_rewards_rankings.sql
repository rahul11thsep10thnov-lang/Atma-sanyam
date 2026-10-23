CREATE TABLE "child_rewards" (
	"child_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "child_rewards_child_id_item_key_pk" PRIMARY KEY("child_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "coin_transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"idempotency_key" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_levels" (
	"child_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"section" text NOT NULL,
	"level" integer NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_levels_child_id_subject_pk" PRIMARY KEY("child_id","subject")
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"child_id" uuid NOT NULL,
	"lesson_id" text NOT NULL,
	"steps_done" integer DEFAULT 0 NOT NULL,
	"steps_total" integer DEFAULT 0 NOT NULL,
	"activities_correct" integer DEFAULT 0 NOT NULL,
	"activities_total" integer DEFAULT 0 NOT NULL,
	"best_quiz_score" integer,
	"quiz_total" integer,
	"time_seconds" integer DEFAULT 0 NOT NULL,
	"selected_age" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"last_step_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_child_id_lesson_id_pk" PRIMARY KEY("child_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"subtopic" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"recommended_age" integer NOT NULL,
	"min_age" integer DEFAULT 3 NOT NULL,
	"max_age" integer DEFAULT 12 NOT NULL,
	"difficulty" text DEFAULT 'beginner' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"learning_objective" text NOT NULL,
	"prerequisites" text[] DEFAULT '{}'::text[] NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_minutes" integer DEFAULT 8 NOT NULL,
	"curriculum" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"safety_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"adult_assisted" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origin" text DEFAULT 'seed' NOT NULL,
	"admin_edited" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_section_check" CHECK ("lessons"."section" in ('study', 'music', 'sports')),
	CONSTRAINT "lessons_status_check" CHECK ("lessons"."status" in ('draft', 'in_review', 'published', 'archived')),
	CONSTRAINT "lessons_age_check" CHECK ("lessons"."recommended_age" between 3 and 12)
);
--> statement-breakpoint
CREATE TABLE "player_ratings" (
	"child_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"rating" integer DEFAULT 1000 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_ratings_child_id_game_id_pk" PRIMARY KEY("child_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "ranking_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"bracket" text NOT NULL,
	"points" integer NOT NULL,
	"won" boolean DEFAULT false NOT NULL,
	"score" integer,
	"rating_delta" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_items" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"emoji" text DEFAULT '🎁' NOT NULL,
	"color" text DEFAULT '#FFC93C' NOT NULL,
	"visual" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price" integer NOT NULL,
	"premium_only" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_items_kind_check" CHECK ("reward_items"."kind" in ('avatar_accessory', 'theme', 'board_skin', 'background', 'badge', 'effect', 'token_design', 'craft_template'))
);
--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "coins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "equipped_rewards" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "game_progress" ADD COLUMN "tutorial_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "curriculum_framework" text;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "curriculum_board" text;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "school_grade" text;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "learning_goals" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "blocked_subjects" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "rankings_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "reward_shop_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "coin_daily_cap" integer;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD COLUMN "reduced_motion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "child_rewards" ADD CONSTRAINT "child_rewards_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_rewards" ADD CONSTRAINT "child_rewards_item_key_reward_items_key_fk" FOREIGN KEY ("item_key") REFERENCES "public"."reward_items"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_levels" ADD CONSTRAINT "learning_levels_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_reviewed_by_admins_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_events" ADD CONSTRAINT "ranking_events_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_events" ADD CONSTRAINT "ranking_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_events" ADD CONSTRAINT "ranking_events_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coin_tx_idempotency_idx" ON "coin_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "coin_tx_child_idx" ON "coin_transactions" USING btree ("child_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_progress_child_idx" ON "lesson_progress" USING btree ("child_id","last_step_at");--> statement-breakpoint
CREATE INDEX "lessons_subject_idx" ON "lessons" USING btree ("section","subject","status","recommended_age");--> statement-breakpoint
CREATE INDEX "player_ratings_game_idx" ON "player_ratings" USING btree ("game_id","rating");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_events_session_idx" ON "ranking_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ranking_events_game_idx" ON "ranking_events" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "ranking_events_child_idx" ON "ranking_events" USING btree ("child_id","game_id");