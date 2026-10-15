CREATE TABLE "account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"child_id" uuid,
	"scope" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT 'star' NOT NULL,
	"rule" jsonb NOT NULL,
	"brackets" text[] DEFAULT '{A,B,C,D}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "age_brackets" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"min_age" integer NOT NULL,
	"max_age" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid,
	"guardian_id" uuid,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "child_achievements" (
	"child_id" uuid NOT NULL,
	"achievement_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "child_achievements_child_id_achievement_key_pk" PRIMARY KEY("child_id","achievement_key")
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"avatar_id" text NOT NULL,
	"birth_month" text NOT NULL,
	"age_bracket" text NOT NULL,
	"bracket_override" text,
	"player_id" text NOT NULL,
	"pin_hash" text NOT NULL,
	"pin_failed_count" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"player_otp_required" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "children_player_id_unique" UNIQUE("player_id"),
	CONSTRAINT "children_status_check" CHECK ("children"."status" in ('active', 'paused', 'removed')),
	CONSTRAINT "children_bracket_check" CHECK ("children"."age_bracket" in ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
CREATE TABLE "content_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craft_progress" (
	"child_id" uuid NOT NULL,
	"tutorial_id" text NOT NULL,
	"steps_done" integer DEFAULT 0 NOT NULL,
	"checklist_done" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "craft_progress_child_id_tutorial_id_pk" PRIMARY KEY("child_id","tutorial_id")
);
--> statement-breakpoint
CREATE TABLE "craft_tutorials" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"brackets" text[] DEFAULT '{}'::text[] NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"estimated_minutes" integer DEFAULT 10 NOT NULL,
	"materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hazards" text[] DEFAULT '{}'::text[] NOT NULL,
	"adult_supervision" boolean DEFAULT false NOT NULL,
	"physical" boolean DEFAULT true NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"final_preview" jsonb,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "craft_tutorials_kind_check" CHECK ("craft_tutorials"."kind" in ('origami', 'paper_craft', 'drawing', 'digital')),
	CONSTRAINT "craft_tutorials_status_check" CHECK ("craft_tutorials"."status" in ('draft', 'in_development', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"guardian_id" uuid PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"subscription_id" uuid,
	"status" text DEFAULT 'never_subscribed' NOT NULL,
	"valid_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fact_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"url" text NOT NULL,
	"accessed_on" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fact_views" (
	"child_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"favourite" boolean DEFAULT false NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fact_views_child_id_fact_id_pk" PRIMARY KEY("child_id","fact_id")
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"headline" text NOT NULL,
	"body" text NOT NULL,
	"why_text" text DEFAULT '' NOT NULL,
	"follow_up_question" text DEFAULT '' NOT NULL,
	"brackets" text[] DEFAULT '{}'::text[] NOT NULL,
	"reading_level" integer DEFAULT 2 NOT NULL,
	"illustration" text DEFAULT 'sparkles' NOT NULL,
	"image_content_id" uuid,
	"audio_url" text,
	"source_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "facts_status_check" CHECK ("facts"."status" in ('draft', 'verified', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "favourite_games" (
	"child_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favourite_games_child_id_game_id_pk" PRIMARY KEY("child_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "game_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'puzzle' NOT NULL,
	"color" text DEFAULT '#FF7A59' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_progress" (
	"child_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"plays" integer DEFAULT 0 NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL,
	"best_score" integer,
	"best_time_seconds" integer,
	"highest_difficulty" text,
	"stars" integer DEFAULT 0 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_progress_child_id_game_id_pk" PRIMARY KEY("child_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"client_session_id" text NOT NULL,
	"device_id" uuid,
	"difficulty" text DEFAULT 'normal' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"outcome" text DEFAULT 'running' NOT NULL,
	"score" integer,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"snapshot" jsonb,
	"snapshot_seq" integer DEFAULT 0 NOT NULL,
	"snapshot_at" timestamp with time zone,
	"paused_by_guardian_at" timestamp with time zone,
	CONSTRAINT "game_sessions_outcome_check" CHECK ("game_sessions"."outcome" in ('running', 'completed', 'abandoned', 'ended_by_guardian', 'timed_out', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"category_id" text,
	"brackets" text[] DEFAULT '{}'::text[] NOT NULL,
	"difficulties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"content_rating" text DEFAULT 'everyone' NOT NULL,
	"estimated_minutes" integer DEFAULT 5 NOT NULL,
	"offline_capable" boolean DEFAULT true NOT NULL,
	"accessibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"asset_license" text DEFAULT 'original' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_status_check" CHECK ("games"."status" in ('draft', 'in_development', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "guardian_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"step_up_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "guardian_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"phone_verified_at" timestamp with time zone NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"terms_version" text NOT NULL,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"privacy_accepted_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_phone_unique" UNIQUE("phone"),
	CONSTRAINT "guardians_status_check" CHECK ("guardians"."status" in ('active', 'deactivated', 'deleted_pending'))
);
--> statement-breakpoint
CREATE TABLE "mirror_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"game_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_frame_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"phone" text NOT NULL,
	"guardian_id" uuid,
	"child_id" uuid,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"context" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "otp_challenges_purpose_check" CHECK ("otp_challenges"."purpose" in ('register', 'login', 'step_up', 'player_login', 'recovery'))
);
--> statement-breakpoint
CREATE TABLE "parental_controls" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"daily_limit_minutes" integer DEFAULT 60 NOT NULL,
	"session_limit_minutes" integer DEFAULT 20 NOT NULL,
	"play_windows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bedtime_start" text,
	"bedtime_end" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"blocked_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"blocked_games" text[] DEFAULT '{}'::text[] NOT NULL,
	"allowed_brackets" text[] DEFAULT '{}'::text[] NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"narration_enabled" boolean DEFAULT true NOT NULL,
	"favourites_enabled" boolean DEFAULT true NOT NULL,
	"mirroring_enabled" boolean DEFAULT true NOT NULL,
	"new_device_approval" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "player_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"chosen_index" integer NOT NULL,
	"correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fact_id" uuid NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screen_time_records" (
	"child_id" uuid NOT NULL,
	"day" text NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "screen_time_records_child_id_day_pk" PRIMARY KEY("child_id","day")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"auto_renewing" boolean DEFAULT true NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"price_amount" integer,
	"price_currency" text,
	"provider_state" jsonb,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_check" CHECK ("subscriptions"."provider" in ('google_play', 'razorpay', 'sandbox')),
	CONSTRAINT "subscriptions_status_check" CHECK ("subscriptions"."status" in ('pending', 'active', 'grace', 'billing_retry', 'cancelled', 'expired', 'revoked', 'paused'))
);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "guardian_id" uuid;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "child_id" uuid;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "guardian_id" uuid;--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_achievements" ADD CONSTRAINT "child_achievements_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_achievements" ADD CONSTRAINT "child_achievements_achievement_key_achievements_key_fk" FOREIGN KEY ("achievement_key") REFERENCES "public"."achievements"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_approvals" ADD CONSTRAINT "content_approvals_reviewer_id_admins_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craft_progress" ADD CONSTRAINT "craft_progress_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craft_progress" ADD CONSTRAINT "craft_progress_tutorial_id_craft_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."craft_tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craft_tutorials" ADD CONSTRAINT "craft_tutorials_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_views" ADD CONSTRAINT "fact_views_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_views" ADD CONSTRAINT "fact_views_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_image_content_id_content_id_fk" FOREIGN KEY ("image_content_id") REFERENCES "public"."content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_source_id_fact_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."fact_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_verified_by_admins_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite_games" ADD CONSTRAINT "favourite_games_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite_games" ADD CONSTRAINT "favourite_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_progress" ADD CONSTRAINT "game_progress_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_progress" ADD CONSTRAINT "game_progress_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_category_id_game_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."game_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_sessions" ADD CONSTRAINT "guardian_sessions_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_sessions" ADD CONSTRAINT "guardian_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mirror_sessions" ADD CONSTRAINT "mirror_sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mirror_sessions" ADD CONSTRAINT "mirror_sessions_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mirror_sessions" ADD CONSTRAINT "mirror_sessions_game_session_id_game_sessions_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_controls" ADD CONSTRAINT "parental_controls_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_time_records" ADD CONSTRAINT "screen_time_records_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deletion_requests_due_idx" ON "account_deletion_requests" USING btree ("scheduled_for","completed_at");--> statement-breakpoint
CREATE INDEX "billing_events_subscription_idx" ON "billing_events" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "children_guardian_idx" ON "children" USING btree ("guardian_id","status");--> statement-breakpoint
CREATE INDEX "content_approvals_entity_idx" ON "content_approvals" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "craft_tutorials_status_idx" ON "craft_tutorials" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "entitlements_valid_until_idx" ON "entitlements" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "fact_views_child_idx" ON "fact_views" USING btree ("child_id","viewed_at");--> statement-breakpoint
CREATE INDEX "facts_status_idx" ON "facts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "facts_category_idx" ON "facts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "facts_brackets_idx" ON "facts" USING gin ("brackets");--> statement-breakpoint
CREATE INDEX "game_progress_child_idx" ON "game_progress" USING btree ("child_id","last_played_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_sessions_client_idx" ON "game_sessions" USING btree ("child_id","client_session_id");--> statement-breakpoint
CREATE INDEX "game_sessions_child_started_idx" ON "game_sessions" USING btree ("child_id","started_at");--> statement-breakpoint
CREATE INDEX "game_sessions_running_idx" ON "game_sessions" USING btree ("outcome","last_heartbeat_at");--> statement-breakpoint
CREATE INDEX "games_status_idx" ON "games" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "games_brackets_idx" ON "games" USING gin ("brackets");--> statement-breakpoint
CREATE INDEX "guardian_sessions_guardian_idx" ON "guardian_sessions" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "guardians_created_at_idx" ON "guardians" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mirror_sessions_child_idx" ON "mirror_sessions" USING btree ("child_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_phone_idx" ON "otp_challenges" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_guardian_idx" ON "otp_challenges" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "player_sessions_child_idx" ON "player_sessions" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_child_idx" ON "quiz_attempts" USING btree ("child_id","created_at");--> statement-breakpoint
CREATE INDEX "quiz_questions_fact_idx" ON "quiz_questions" USING btree ("fact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_ref_idx" ON "subscriptions" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "subscriptions_guardian_idx" ON "subscriptions" USING btree ("guardian_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_period_end_idx" ON "subscriptions" USING btree ("current_period_end");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "devices_guardian_idx" ON "devices" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "devices_child_idx" ON "devices" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "events_guardian_idx" ON "events" USING btree ("guardian_id");