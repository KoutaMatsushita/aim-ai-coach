PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_device_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code` text NOT NULL,
	`user_code` text NOT NULL,
	`user_id` text,
	`client_id` text,
	`scope` text,
	`status` text NOT NULL,
	`expires_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`last_polled_at` integer,
	`polling_interval` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_device_codes`("id", "device_code", "user_code", "user_id", "client_id", "scope", "status", "expires_at", "last_polled_at", "polling_interval", "created_at", "updated_at") SELECT "id", "device_code", "user_code", "user_id", "client_id", "scope", "status", "expires_at", "last_polled_at", "polling_interval", "created_at", "updated_at" FROM `device_codes`;--> statement-breakpoint
DROP TABLE `device_codes`;--> statement-breakpoint
ALTER TABLE `__new_device_codes` RENAME TO `device_codes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `device_codes_user_id_idx` ON `device_codes` (`user_id`);