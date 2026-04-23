ALTER TABLE `subscriptions` ADD `stripeCustomerId` varchar(128);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeSubscriptionId` varchar(128);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeSessionId` varchar(128);