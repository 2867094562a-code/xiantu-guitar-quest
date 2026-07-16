CREATE TABLE `daily_practice_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`practice_date` text NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_practice_user_date_unique` ON `daily_practice_states` (`user_id`,`practice_date`);