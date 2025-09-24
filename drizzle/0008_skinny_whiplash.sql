PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_aimlab_task_data` (
	`taskId` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
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
DROP INDEX `kovaaks_scores_discord_user_idx`;--> statement-breakpoint
DROP INDEX `kovaaks_scores_user_epoch_idx`;--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_id_idx` ON `kovaaks_scores` (`user_id`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_epoch_idx` ON `kovaaks_scores` (`user_id`,`run_epoch_sec`);--> statement-breakpoint
ALTER TABLE `kovaaks_scores` ALTER COLUMN "user_id" TO "user_id" integer REFERENCES users(id) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kovaaks_scores` DROP COLUMN `discord_user_id`;