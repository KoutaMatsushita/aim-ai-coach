CREATE TABLE `daily_report` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`report` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_report_user_id_idx` ON `daily_report` (`user_id`);--> statement-breakpoint
CREATE INDEX `daily_report_user_started_idx` ON `daily_report` (`user_id`,`createdAt`);--> statement-breakpoint
CREATE TABLE `monthly_report` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`report` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `monthly_report_user_id_idx` ON `monthly_report` (`user_id`);--> statement-breakpoint
CREATE INDEX `monthly_report_user_started_idx` ON `monthly_report` (`user_id`,`createdAt`);--> statement-breakpoint
CREATE TABLE `weekly_report` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`report` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `weekly_report_user_id_idx` ON `weekly_report` (`user_id`);--> statement-breakpoint
CREATE INDEX `weekly_report_user_started_idx` ON `weekly_report` (`user_id`,`createdAt`);