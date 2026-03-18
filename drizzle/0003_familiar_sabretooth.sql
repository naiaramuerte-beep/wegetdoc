CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(512) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL DEFAULT 0,
	`folderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`inviteeEmail` varchar(320) NOT NULL,
	`inviteeId` int,
	`role` enum('editor','viewer','admin') NOT NULL DEFAULT 'editor',
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contact_messages` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `contact_messages` ADD `reason` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `language` varchar(16) DEFAULT 'es';--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(64) DEFAULT 'Europe/Madrid';