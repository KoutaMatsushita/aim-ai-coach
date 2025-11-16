CREATE TABLE `daily_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` integer NOT NULL,
	`sessions_count` integer NOT NULL,
	`total_duration` integer NOT NULL,
	`performance_rating` text NOT NULL,
	`achievements` text NOT NULL,
	`challenges` text NOT NULL,
	`tomorrow_recommendations` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_reports_user_id_idx` ON `daily_reports` (`user_id`);--> statement-breakpoint
CREATE INDEX `daily_reports_date_idx` ON `daily_reports` (`date`);--> statement-breakpoint
CREATE INDEX `daily_reports_user_date_idx` ON `daily_reports` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`scenarios` text NOT NULL,
	`target_weaknesses` text NOT NULL,
	`total_duration` integer NOT NULL,
	`reasoning` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlists_user_id_idx` ON `playlists` (`user_id`);--> statement-breakpoint
CREATE INDEX `playlists_is_active_idx` ON `playlists` (`is_active`);--> statement-breakpoint
CREATE INDEX `playlists_user_active_idx` ON `playlists` (`user_id`,`is_active`);