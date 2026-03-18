CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`subject` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legal_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `legal_pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(64);