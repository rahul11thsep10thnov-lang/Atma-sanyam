CREATE TABLE "group_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"message_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_participants" (
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"reward_minutes" integer DEFAULT 0 NOT NULL,
	"penalty_count" integer DEFAULT 0 NOT NULL,
	"penalty_applied_at" timestamp with time zone,
	"focus_session_id" uuid,
	CONSTRAINT "group_participants_session_id_user_id_pk" PRIMARY KEY("session_id","user_id"),
	CONSTRAINT "group_participants_status_check" CHECK ("group_participants"."status" in ('invited', 'rejected', 'approved', 'ready', 'join_requested', 'active', 'left_early', 'completed', 'disconnected'))
);
--> statement-breakpoint
CREATE TABLE "group_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"status" text DEFAULT 'lobby' NOT NULL,
	"proposal" jsonb NOT NULL,
	"planned_minutes" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"members_at_start" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "group_sessions_status_check" CHECK ("group_sessions"."status" in ('lobby', 'running', 'ended', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_session_id_group_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_participants" ADD CONSTRAINT "group_participants_session_id_group_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_participants" ADD CONSTRAINT "group_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_messages_session_idx" ON "group_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "group_participants_user_idx" ON "group_participants" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "group_sessions_host_idx" ON "group_sessions" USING btree ("host_id","status");--> statement-breakpoint
CREATE INDEX "group_sessions_status_idx" ON "group_sessions" USING btree ("status","ends_at");