CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_provider_account_idx` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `aimlab_task_data` (
	`taskId` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`klutchId` text,
	`createDate` numeric,
	`taskName` text,
	`score` integer,
	`mode` integer,
	`aimlab_map` integer,
	`aimlab_version` text,
	`weaponType` text,
	`weaponName` text,
	`performanceClass` text,
	`workshopId` text,
	`performance` text,
	`playId` text,
	`startedAt` integer,
	`endedAt` integer,
	`hasReplay` integer,
	`weaponSkin` text,
	`appId` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `aimlab_task_user_id_idx` ON `aimlab_task_data` (`user_id`);--> statement-breakpoint
CREATE INDEX `aimlab_task_started_at_idx` ON `aimlab_task_data` (`startedAt`);--> statement-breakpoint
CREATE INDEX `aimlab_task_user_started_idx` ON `aimlab_task_data` (`user_id`,`startedAt`);--> statement-breakpoint
CREATE TABLE `device_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code` text NOT NULL,
	`user_code` text NOT NULL,
	`user_id` text,
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
CREATE TABLE `kovaaks_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`scenario_name` text NOT NULL,
	`mode` text NOT NULL,
	`run_datetime_text` text NOT NULL,
	`run_epoch_sec` integer NOT NULL,
	`source_filename` text NOT NULL,
	`accuracy` real NOT NULL,
	`bot` text NOT NULL,
	`cheated` integer NOT NULL,
	`damage_done` real NOT NULL,
	`damage_possible` real NOT NULL,
	`efficiency` real NOT NULL,
	`hits` integer NOT NULL,
	`kill_number` integer NOT NULL,
	`overshots` integer NOT NULL,
	`shots` integer NOT NULL,
	`ttk` text NOT NULL,
	`timestamp` text NOT NULL,
	`weapon` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_id_idx` ON `kovaaks_scores` (`user_id`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_epoch_idx` ON `kovaaks_scores` (`run_epoch_sec`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_epoch_idx` ON `kovaaks_scores` (`user_id`,`run_epoch_sec`);--> statement-breakpoint
CREATE UNIQUE INDEX `kovaaks_scores_source_filename_timestamp_unique` ON `kovaaks_scores` (`source_filename`,`timestamp`);--> statement-breakpoint
CREATE TABLE `local_complete_aimlab_task` (
	`task_id` integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `local_complete_kovaaks_score` (
	`file_name` text PRIMARY KEY NOT NULL,
	`file_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `local_complete_kovaaks_score_file_name_file_hash_idx` ON `local_complete_kovaaks_score` (`file_name`,`file_hash`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
