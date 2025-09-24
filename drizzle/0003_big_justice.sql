DROP INDEX "aimlab_task_discord_user_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_discord_user_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_source_filename_timestamp_unique";--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "startedAt" TO "startedAt" integer;--> statement-breakpoint
CREATE INDEX `aimlab_task_discord_user_idx` ON `aimlab_task_data` (`discord_user_id`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_discord_user_idx` ON `kovaaks_scores` (`discord_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `kovaaks_scores_source_filename_timestamp_unique` ON `kovaaks_scores` (`source_filename`,`timestamp`);--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "endedAt" TO "endedAt" integer;