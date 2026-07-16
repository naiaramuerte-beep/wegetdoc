CREATE TABLE IF NOT EXISTS `payment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`userId` int,
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	`paymentMethod` varchar(16),
	`amountCents` int,
	`responseCode` varchar(16),
	`success` boolean NOT NULL,
	`rawResponse` text,
	CONSTRAINT `payment_attempts_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `retryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `nextRetryAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `lastDeclineCode` varchar(16);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `declineCategory` enum('soft','hard','unknown');--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `dunningLockedAt` timestamp;--> statement-breakpoint
CREATE INDEX `pa_sub_idx` ON `payment_attempts` (`subscriptionId`);--> statement-breakpoint
CREATE INDEX `subs_next_retry_idx` ON `subscriptions` (`nextRetryAt`);
