CREATE TABLE `device_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code` text NOT NULL,
	`user_code` text NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text,
	`scope` text,
	`status` text NOT NULL,
	`expires_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`last_polled_at` integer,
	`polling_interval` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `device_codes_user_id_idx` ON `device_codes` (`user_id`);--> statement-breakpoint
DROP TABLE `discord_users`;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ADD `user_id` integer;--> statement-breakpoint
CREATE INDEX `aimlab_task_started_at_idx` ON `aimlab_task_data` (`startedAt`);--> statement-breakpoint
CREATE INDEX `aimlab_task_user_started_idx` ON `aimlab_task_data` (`discord_user_id`,`startedAt`);--> statement-breakpoint
ALTER TABLE `kovaaks_scores` ADD `user_id` integer;--> statement-breakpoint
CREATE INDEX `kovaaks_scores_epoch_idx` ON `kovaaks_scores` (`run_epoch_sec`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_epoch_idx` ON `kovaaks_scores` (`discord_user_id`,`run_epoch_sec`);--> statement-breakpoint
CREATE INDEX `accounts_provider_account_idx` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE VIEW `user_discord_data` AS 
	SELECT
		u.id as user_id,
		u.name as user_name,
		u.email as user_email,
		a.account_id as discord_id
	FROM users u
	INNER JOIN accounts a ON u.id = a.user_id
	WHERE a.provider_id = 'discord'
;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `discord_id`;