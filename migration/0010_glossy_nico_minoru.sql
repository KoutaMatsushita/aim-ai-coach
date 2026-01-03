ALTER TABLE `chat_messages` ADD `parts` text;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `metadata` text;--> statement-breakpoint
ALTER TABLE `chat_messages` DROP COLUMN `content`;