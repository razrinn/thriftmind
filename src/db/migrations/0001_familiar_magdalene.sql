PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_items` (
	`id` text PRIMARY KEY NOT NULL,
	`short_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`current_price` real NOT NULL,
	`target_price` real,
	`last_checked` integer NOT NULL,
	`error_count` integer DEFAULT 0,
	`last_error` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_items`("id", "short_id", "url", "title", "current_price", "target_price", "last_checked", "error_count", "last_error", "user_id") SELECT "id", "short_id", "url", "title", "current_price", "target_price", "last_checked", "error_count", "last_error", "user_id" FROM `items`;--> statement-breakpoint
DROP TABLE `items`;--> statement-breakpoint
ALTER TABLE `__new_items` RENAME TO `items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `items_short_id_unique` ON `items` (`short_id`);--> statement-breakpoint
CREATE INDEX `items_user_id_idx` ON `items` (`user_id`);