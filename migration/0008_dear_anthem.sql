CREATE TABLE `benchmark_ranks` (
	`id` text PRIMARY KEY NOT NULL,
	`benchmark_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`color` text,
	`image_url` text,
	FOREIGN KEY (`benchmark_id`) REFERENCES `benchmarks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `benchmark_ranks_benchmark_id_idx` ON `benchmark_ranks` (`benchmark_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `benchmark_ranks_benchmark_id_order_unique` ON `benchmark_ranks` (`benchmark_id`,`order`);--> statement-breakpoint
CREATE TABLE `benchmark_scenario_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`rank_id` text NOT NULL,
	`min_score` real NOT NULL,
	FOREIGN KEY (`scenario_id`) REFERENCES `benchmark_scenarios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rank_id`) REFERENCES `benchmark_ranks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `benchmark_reqs_scenario_id_idx` ON `benchmark_scenario_requirements` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `benchmark_reqs_rank_id_idx` ON `benchmark_scenario_requirements` (`rank_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `benchmark_scenario_requirements_scenario_id_rank_id_unique` ON `benchmark_scenario_requirements` (`scenario_id`,`rank_id`);--> statement-breakpoint
CREATE TABLE `benchmark_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`benchmark_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`sub_category` text,
	`description` text,
	`game` text NOT NULL,
	FOREIGN KEY (`benchmark_id`) REFERENCES `benchmarks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `benchmark_scenarios_benchmark_id_idx` ON `benchmark_scenarios` (`benchmark_id`);--> statement-breakpoint
CREATE INDEX `benchmark_scenarios_name_idx` ON `benchmark_scenarios` (`name`);--> statement-breakpoint
CREATE TABLE `benchmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`version` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `benchmarks_name_version_unique` ON `benchmarks` (`name`,`version`);