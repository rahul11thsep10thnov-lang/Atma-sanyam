CREATE TABLE "dadu_assignment_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"assignment_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"photo_asset_id" text,
	"consent_id" uuid,
	CONSTRAINT "dadu_assignment_completions_note_check" CHECK (char_length("dadu_assignment_completions"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "dadu_child_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"band" text NOT NULL,
	"difficulty" text DEFAULT 'steady' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"helper_language" text,
	"language_mode" text DEFAULT 'single' NOT NULL,
	"avatar" jsonb NOT NULL,
	"temple_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dadu_child_profiles_band_check" CHECK ("dadu_child_profiles"."band" in ('A0', 'A1', 'A2', 'A3', 'A4', 'A5')),
	CONSTRAINT "dadu_child_profiles_difficulty_check" CHECK ("dadu_child_profiles"."difficulty" in ('gentle', 'steady', 'stretch')),
	CONSTRAINT "dadu_child_profiles_name_length_check" CHECK (char_length("dadu_child_profiles"."name") between 1 and 40)
);
--> statement-breakpoint
CREATE TABLE "dadu_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"child_id" uuid,
	"version" text NOT NULL,
	"kind" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "dadu_consents_kind_check" CHECK ("dadu_consents"."kind" in ('processing', 'photos', 'analytics'))
);
--> statement-breakpoint
CREATE TABLE "dadu_content_items" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"section" text,
	"subject" text,
	"topic" text,
	"bands" text[] DEFAULT '{}'::text[] NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"rights" text DEFAULT 'original' NOT NULL,
	"provenance" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"published_version" integer,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dadu_content_items_id_check" CHECK ("dadu_content_items"."id" ~ '^[a-z0-9_.-]{3,120}$'),
	CONSTRAINT "dadu_content_items_difficulty_check" CHECK ("dadu_content_items"."difficulty" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "dadu_content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" text NOT NULL,
	"version" integer NOT NULL,
	"body" jsonb NOT NULL,
	"change_note" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dadu_feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dadu_mastery" (
	"child_id" uuid NOT NULL,
	"concept" text NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_review_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dadu_mastery_child_id_concept_pk" PRIMARY KEY("child_id","concept")
);
--> statement-breakpoint
CREATE TABLE "dadu_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"sha256" text NOT NULL,
	"licence" text NOT NULL,
	"source" text NOT NULL,
	"creator" text NOT NULL,
	"attribution_required" boolean DEFAULT false NOT NULL,
	"attribution_text" text,
	"character_key" text,
	"location_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dadu_media_assets_sha256_unique" UNIQUE("sha256"),
	CONSTRAINT "dadu_media_assets_sha_check" CHECK ("dadu_media_assets"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "dadu_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"language" text,
	"version" integer NOT NULL,
	"manifest" jsonb NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"sha256" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dadu_progress_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"client_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dadu_progress_events_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "dadu_progress_events_kind_check" CHECK ("dadu_progress_events"."kind" in ('lesson', 'story', 'activity', 'assessment', 'assignment'))
);
--> statement-breakpoint
CREATE TABLE "dadu_review_steps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"version" integer NOT NULL,
	"step" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_id" uuid,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dadu_screen_rules" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"daily_minutes" integer,
	"bedtime" text,
	"break_every_minutes" integer DEFAULT 20 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dadu_screen_time" (
	"child_id" uuid NOT NULL,
	"day" date NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dadu_screen_time_child_id_day_pk" PRIMARY KEY("child_id","day")
);
--> statement-breakpoint
CREATE TABLE "dadu_sync_cursors" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"cursor" text DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dadu_world_states" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dadu_assignment_completions" ADD CONSTRAINT "dadu_assignment_completions_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_assignment_completions" ADD CONSTRAINT "dadu_assignment_completions_consent_id_dadu_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."dadu_consents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_child_profiles" ADD CONSTRAINT "dadu_child_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_consents" ADD CONSTRAINT "dadu_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_consents" ADD CONSTRAINT "dadu_consents_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_content_items" ADD CONSTRAINT "dadu_content_items_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_content_items" ADD CONSTRAINT "dadu_content_items_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_content_versions" ADD CONSTRAINT "dadu_content_versions_item_id_dadu_content_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."dadu_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_content_versions" ADD CONSTRAINT "dadu_content_versions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_feature_flags" ADD CONSTRAINT "dadu_feature_flags_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_mastery" ADD CONSTRAINT "dadu_mastery_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_media_assets" ADD CONSTRAINT "dadu_media_assets_uploaded_by_admins_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_packs" ADD CONSTRAINT "dadu_packs_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_progress_events" ADD CONSTRAINT "dadu_progress_events_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_review_steps" ADD CONSTRAINT "dadu_review_steps_item_id_dadu_content_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."dadu_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_review_steps" ADD CONSTRAINT "dadu_review_steps_reviewer_id_admins_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_screen_rules" ADD CONSTRAINT "dadu_screen_rules_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_screen_time" ADD CONSTRAINT "dadu_screen_time_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_sync_cursors" ADD CONSTRAINT "dadu_sync_cursors_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadu_world_states" ADD CONSTRAINT "dadu_world_states_child_id_dadu_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."dadu_child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dadu_assignment_completions_unique" ON "dadu_assignment_completions" USING btree ("child_id","assignment_id");--> statement-breakpoint
CREATE INDEX "dadu_child_profiles_user_idx" ON "dadu_child_profiles" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "dadu_consents_user_idx" ON "dadu_consents" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "dadu_consents_child_idx" ON "dadu_consents" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "dadu_content_items_kind_status_idx" ON "dadu_content_items" USING btree ("kind","status","updated_at");--> statement-breakpoint
CREATE INDEX "dadu_content_items_section_idx" ON "dadu_content_items" USING btree ("section","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "dadu_content_versions_item_version" ON "dadu_content_versions" USING btree ("item_id","version");--> statement-breakpoint
CREATE INDEX "dadu_mastery_due_idx" ON "dadu_mastery" USING btree ("child_id","next_review_at");--> statement-breakpoint
CREATE INDEX "dadu_media_assets_kind_idx" ON "dadu_media_assets" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "dadu_media_assets_character_idx" ON "dadu_media_assets" USING btree ("character_key");--> statement-breakpoint
CREATE INDEX "dadu_media_assets_location_idx" ON "dadu_media_assets" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dadu_packs_kind_language_version" ON "dadu_packs" USING btree ("kind","language","version");--> statement-breakpoint
CREATE INDEX "dadu_packs_status_idx" ON "dadu_packs" USING btree ("status","kind");--> statement-breakpoint
CREATE INDEX "dadu_progress_events_child_idx" ON "dadu_progress_events" USING btree ("child_id","id");--> statement-breakpoint
CREATE INDEX "dadu_review_steps_item_idx" ON "dadu_review_steps" USING btree ("item_id","version","id");