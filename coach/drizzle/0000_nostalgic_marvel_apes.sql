CREATE TABLE `aimlab_task_data` (
	`id` integer PRIMARY KEY NOT NULL,
	`discord_user_id` text NOT NULL,
	`user_id_hash` text NOT NULL,
	`played_at` text NOT NULL,
	`task_name` text NOT NULL,
	`score` integer NOT NULL,
	`difficulty` integer NOT NULL,
	`cheated` integer NOT NULL,
	`game_version` text NOT NULL,
	`weapon` text NOT NULL,
	`caliber` text NOT NULL,
	`data_type` text NOT NULL,
	`note` text,
	`details_json` text NOT NULL,
	`session_id` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`attempt` integer NOT NULL,
	`variant` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `aimlab_task_discord_user_idx` ON `aimlab_task_data` (`discord_user_id`);--> statement-breakpoint
CREATE TABLE `discord_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`avatar` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kovaaks_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discord_user_id` text NOT NULL,
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
	`weapon` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `kovaaks_scores_discord_user_idx` ON `kovaaks_scores` (`discord_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `kovaaks_scores_source_filename_timestamp_unique` ON `kovaaks_scores` (`source_filename`,`timestamp`);