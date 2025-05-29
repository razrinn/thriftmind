CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`short_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`current_price` real NOT NULL,
	`target_price` real,
	`last_checked` integer NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_short_id_unique` ON `items` (`short_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `url_idx` ON `items` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `last_checked_idx` ON `items` (`last_checked`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`old_price` real NOT NULL,
	`new_price` real NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`price` real NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`first_name` text NOT NULL,
	`last_name` text,
	`created_at` integer NOT NULL,
	`max_items` integer DEFAULT 5 NOT NULL
);
