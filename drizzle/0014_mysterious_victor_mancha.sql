CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`adminEmail` varchar(320),
	`action` varchar(64) NOT NULL,
	`targetType` varchar(64),
	`targetId` varchar(128),
	`metadata` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'stripe',
	`eventId` varchar(128),
	`eventType` varchar(128) NOT NULL,
	`status` enum('ok','error') NOT NULL,
	`errorMessage` text,
	`durationMs` int NOT NULL DEFAULT 0,
	`payload` text,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancelReason` enum('too_expensive','not_using','missing_feature','bug_or_issue','switched_tool','temporary','other');--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancelFeedback` text;--> statement-breakpoint
ALTER TABLE `users` ADD `adminNotes` text;