CREATE TABLE "progress_events" (
	"user_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_events_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "user_bookmarks" (
	"user_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_bookmarks_user_id_question_key_pk" PRIMARY KEY("user_id","question_key")
);
--> statement-breakpoint
CREATE TABLE "user_mistakes" (
	"user_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"wrong_count" integer DEFAULT 0 NOT NULL,
	"last_wrong_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_mistakes_user_id_question_key_pk" PRIMARY KEY("user_id","question_key")
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_quiz_date" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_events" ADD CONSTRAINT "progress_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mistakes" ADD CONSTRAINT "user_mistakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "progress_events_user_idx" ON "progress_events" USING btree ("user_id","received_at");