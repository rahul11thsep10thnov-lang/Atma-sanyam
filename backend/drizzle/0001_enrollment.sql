CREATE TYPE "public"."mock_test_kind" AS ENUM('full', 'subject');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" text DEFAULT 'yearly' NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"amount_inr" integer NOT NULL,
	"list_price_inr" integer,
	"provider" text NOT NULL,
	"provider_order_id" text,
	"provider_payment_id" text,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"granted_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_tests" ADD COLUMN "kind" "mock_test_kind" DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_granted_by_admins_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_order_uq" ON "subscriptions" USING btree ("provider_order_id");