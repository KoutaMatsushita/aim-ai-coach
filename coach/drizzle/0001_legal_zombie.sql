PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_aimlab_task_data` (
	`taskId` integer PRIMARY KEY NOT NULL,
	`discord_user_id` text NOT NULL,
	`klutchId` text(140),
	`createDate` numeric,
	`taskName` text(140),
	`score` integer,
	`mode` integer,
	`aimlab_map` integer,
	`aimlab_version` text(140),
	`weaponType` text(140),
	`weaponName` text(140),
	`performanceClass` text(140),
	`workshopId` text(140),
	`performance` text(140),
	`playId` text(140),
	`startedAt` numeric,
	`endedAt` numeric,
	`hasReplay` integer,
	`weaponSkin` text(140),
	`appId` text
);
--> statement-breakpoint
INSERT INTO `__new_aimlab_task_data`("taskId", "discord_user_id", "klutchId", "createDate", "taskName", "score", "mode", "aimlab_map", "aimlab_version", "weaponType", "weaponName", "performanceClass", "workshopId", "performance", "playId", "startedAt", "endedAt", "hasReplay", "weaponSkin", "appId") SELECT "taskId", "discord_user_id", "klutchId", "createDate", "taskName", "score", "mode", "aimlab_map", "aimlab_version", "weaponType", "weaponName", "performanceClass", "workshopId", "performance", "playId", "startedAt", "endedAt", "hasReplay", "weaponSkin", "appId" FROM `aimlab_task_data`;--> statement-breakpoint
DROP TABLE `aimlab_task_data`;--> statement-breakpoint
ALTER TABLE `__new_aimlab_task_data` RENAME TO `aimlab_task_data`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `aimlab_task_discord_user_idx` ON `aimlab_task_data` (`discord_user_id`);