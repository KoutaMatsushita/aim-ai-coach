DROP INDEX "accounts_provider_account_idx";--> statement-breakpoint
DROP INDEX "accounts_user_id_idx";--> statement-breakpoint
DROP INDEX "aimlab_task_user_id_idx";--> statement-breakpoint
DROP INDEX "aimlab_task_started_at_idx";--> statement-breakpoint
DROP INDEX "aimlab_task_user_started_idx";--> statement-breakpoint
DROP INDEX "device_codes_user_id_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_user_id_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_epoch_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_user_epoch_idx";--> statement-breakpoint
DROP INDEX "kovaaks_scores_source_filename_timestamp_unique";--> statement-breakpoint
DROP INDEX "local_complete_kovaaks_score_file_name_file_hash_idx";--> statement-breakpoint
DROP INDEX "sessions_token_unique";--> statement-breakpoint
DROP INDEX "sessions_user_id_idx";--> statement-breakpoint
DROP INDEX "sessions_expires_at_idx";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "startedAt" TO "startedAt" text;--> statement-breakpoint
CREATE INDEX `accounts_provider_account_idx` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `aimlab_task_user_id_idx` ON `aimlab_task_data` (`user_id`);--> statement-breakpoint
CREATE INDEX `aimlab_task_started_at_idx` ON `aimlab_task_data` (`startedAt`);--> statement-breakpoint
CREATE INDEX `aimlab_task_user_started_idx` ON `aimlab_task_data` (`user_id`,`startedAt`);--> statement-breakpoint
CREATE INDEX `device_codes_user_id_idx` ON `device_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_id_idx` ON `kovaaks_scores` (`user_id`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_epoch_idx` ON `kovaaks_scores` (`run_epoch_sec`);--> statement-breakpoint
CREATE INDEX `kovaaks_scores_user_epoch_idx` ON `kovaaks_scores` (`user_id`,`run_epoch_sec`);--> statement-breakpoint
CREATE UNIQUE INDEX `kovaaks_scores_source_filename_timestamp_unique` ON `kovaaks_scores` (`source_filename`,`timestamp`);--> statement-breakpoint
CREATE INDEX `local_complete_kovaaks_score_file_name_file_hash_idx` ON `local_complete_kovaaks_score` (`file_name`,`file_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `aimlab_task_data` ALTER COLUMN "endedAt" TO "endedAt" text;