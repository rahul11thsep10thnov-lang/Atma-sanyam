CREATE TABLE "source_verification_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"trigger" text NOT NULL,
	"outcome" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"detail" text
);
--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "source_key" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "origin" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "connector" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "attribution_template" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "licence_name" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "licence_url" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "licence_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "commercial_use_allowed" boolean;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "redistribution_allowed" boolean;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "attribution_required" boolean;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "share_alike_required" boolean;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "api_key_required" boolean;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "rate_limit_notes" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "content_types_allowed" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "verification_status" text DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "verification_evidence_url" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "last_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "last_check_error" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "evidence_hash" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "evidence_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "ingestion_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "admin_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD COLUMN "status_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "ingestion_kind" text DEFAULT 'editorial' NOT NULL;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "minimum_age" integer;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "maximum_age" integer;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "supporting_reference" text;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "licence_name" text;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "attribution_text" text;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "claim_check" text;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "source_verification_events" ADD CONSTRAINT "source_verification_events_source_id_fact_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."fact_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_events_source_idx" ON "source_verification_events" USING btree ("source_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "fact_sources_source_key_idx" ON "fact_sources" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "fact_sources_canonical_url_idx" ON "fact_sources" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "fact_sources_status_idx" ON "fact_sources" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "facts_content_hash_idx" ON "facts" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "facts_ingestion_idx" ON "facts" USING btree ("ingestion_kind","source_id");--> statement-breakpoint
ALTER TABLE "fact_sources" ADD CONSTRAINT "fact_sources_status_check" CHECK ("fact_sources"."verification_status" in ('pending_review', 'approved', 'restricted', 'unavailable', 'verification_failed'));--> statement-breakpoint
ALTER TABLE "fact_sources" ADD CONSTRAINT "fact_sources_origin_check" CHECK ("fact_sources"."origin" in ('admin', 'registry', 'editorial', 'discovered'));