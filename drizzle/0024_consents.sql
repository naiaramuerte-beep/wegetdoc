CREATE TABLE IF NOT EXISTS `consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`event` enum('register','payment') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`ip` varchar(64),
	`userAgent` varchar(512),
	`lang` varchar(8),
	`textShown` text,
	`termsHash` varchar(64),
	`introCents` int,
	`recurringCents` int,
	`trialHours` int,
	`provider` varchar(16),
	`sipayOrder` varchar(128),
	CONSTRAINT `consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `consents_userId_idx` ON `consents` (`userId`);
--> statement-breakpoint
CREATE INDEX `consents_createdAt_idx` ON `consents` (`createdAt`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `legal_snapshots` (
	`hash` varchar(64) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`title` varchar(256),
	`content` mediumtext,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legal_snapshots_hash` PRIMARY KEY(`hash`)
);
