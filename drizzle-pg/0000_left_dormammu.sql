CREATE TABLE "course_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track" text NOT NULL,
	"stage_id" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_practice_states" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"practice_date" text NOT NULL,
	"state_json" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exercise_type" text NOT NULL,
	"exercise_id" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"bpm" integer,
	"score" integer,
	"pain_score" integer,
	"completed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"track" text NOT NULL,
	"tempo" integer,
	"time_signature" text,
	"key_signature" text,
	"staff_count" integer,
	"measure_count" integer,
	"note_count" integer,
	"confidence" integer DEFAULT 0 NOT NULL,
	"recognized_text" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"goal_minutes" integer DEFAULT 60 NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_practice_states" ADD CONSTRAINT "daily_practice_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_imports" ADD CONSTRAINT "score_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_practice_user_date_unique" ON "daily_practice_states" USING btree ("user_id","practice_date");