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
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_aimlab_task_data` (
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
INSERT INTO `__new_aimlab_task_data`("taskId", "user_id", "klutchId", "createDate", "taskName", "score", "mode", "aimlab_map", "aimlab_version", "weaponType", "weaponName", "performanceClass", "workshopId", "performance", "playId", "startedAt", "endedAt", "hasReplay", "weaponSkin", "appId") SELECT "taskId", "user_id", "klutchId", "createDate", "taskName", "score", "mode", "aimlab_map", "aimlab_version", "weaponType", "weaponName", "performanceClass", "workshopId", "performance", "playId", "startedAt", "endedAt", "hasReplay", "weaponSkin", "appId" FROM `aimlab_task_data`;--> statement-breakpoint
DROP TABLE `aimlab_task_data`;--> statement-breakpoint
ALTER TABLE `__new_aimlab_task_data` RENAME TO `aimlab_task_data`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `aimlab_task_user_id_idx` ON `aimlab_task_data` (`user_id`);--> statement-breakpoint
CREATE INDEX `aimlab_task_started_at_idx` ON `aimlab_task_data` (`startedAt`);--> statement-breakpoint
CREATE INDEX `aimlab_task_user_started_idx` ON `aimlab_task_data` (`user_id`,`startedAt`);--> statement-breakpoint
CREATE TABLE `__new_kovaaks_scores` (
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
INSERT INTO `__new_kovaaks_scores`("id", "user_id", "scenario_name", "mode", "run_datetime_text", "run_epoch_sec", "source_filename", "accuracy", "bot", "cheated", "damage_done", "damage_possible", "efficiency", "hits", "kill_number", "overshots", "shots", "ttk", "timestamp", "weapon") SELECT "id", "user_id", "scenario_name", "mode", "run_datetime_text", "run_epoch_sec", "source_filename", "accuracy", "bot", "cheated", "damage_done", "damage_possible", "efficiency", "hits", "kill_number", "overshots", "shots", "ttk", "timestamp", "weapon" FROM `kovaaks_scores`;--> statement-breakpoint
DROP TABLE `kovaaks_scores`;--> statement-breakpoint
ALTER TABLE `__new_kovaaks_scores` RENAME TO `kovaaks_scores`;--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_id_idx` ON `kovaaks_scores` (`user_id`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_epoch_idx` ON `kovaaks_scores` (`run_epoch_sec`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_epoch_idx` ON `kovaaks_scores` (`user_id`,`run_epoch_sec`);--> statement-breakpoint
CREATE UNIQUE INDEX `kovaaks_scores_source_filename_timestamp_unique` ON `kovaaks_scores` (`source_filename`,`timestamp`);