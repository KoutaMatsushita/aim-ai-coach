CREATE TABLE `local_complete_aimlab_task` (
	`task_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `local_complete_kovaaks_score` (
	`file_name` text PRIMARY KEY NOT NULL,
	`file_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `local_complete_kovaaks_score_file_name_file_hash_idx` ON `local_complete_kovaaks_score` (`file_name`,`file_hash`);