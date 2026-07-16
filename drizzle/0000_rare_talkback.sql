CREATE TABLE `course_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`track` text NOT NULL,
	`stage_id` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_type` text NOT NULL,
	`exercise_id` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`bpm` integer,
	`score` integer,
	`pain_score` integer,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `score_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`track` text NOT NULL,
	`tempo` integer,
	`time_signature` text,
	`key_signature` text,
	`staff_count` integer,
	`measure_count` integer,
	`note_count` integer,
	`confidence` integer DEFAULT 0 NOT NULL,
	`recognized_text` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`goal_minutes` integer DEFAULT 60 NOT NULL,
	`current_level` integer DEFAULT 1 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`total_xp` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);