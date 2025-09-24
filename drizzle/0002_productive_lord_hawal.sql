DROP INDEX "aimlab_task_discord_user_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_discord_user_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_source_filename_timestamp_unique";--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "klutchId" TO "klutchId" text;--> statement-breakpoint
CREATE INDEX `aimlab_task_discord_user_idx` ON `aimlab_task_data` (`discord_user_id`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_discord_user_idx` ON `kovaaks_scores` (`discord_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `kovaaks_scores_source_filename_timestamp_unique` ON `kovaaks_scores` (`source_filename`,`timestamp`);--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "taskName" TO "taskName" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "aimlab_version" TO "aimlab_version" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "weaponType" TO "weaponType" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "weaponName" TO "weaponName" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "performanceClass" TO "performanceClass" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "workshopId" TO "workshopId" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "performance" TO "performance" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "playId" TO "playId" text;--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "weaponSkin" TO "weaponSkin" text;