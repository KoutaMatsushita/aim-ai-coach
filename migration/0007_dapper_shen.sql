ALTER TABLE `kovaaks_scores` ADD `score` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `kovaaks_scores` ADD `session_accuracy` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `kovaaks_scores` ADD `meta` text;