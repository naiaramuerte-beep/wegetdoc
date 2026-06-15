-- Adds Sipay tokenization columns to subscriptions so new subs created through
-- Sipay (FastPay / Apple Pay / Google Pay) can be billed monthly via MIT-R.
-- Stripe columns kept for legacy subs created before this cutover.
ALTER TABLE `subscriptions`
  ADD COLUMN `sipayToken` VARCHAR(256) NULL,
  ADD COLUMN `sipayOrder` VARCHAR(128) NULL,
  ADD COLUMN `sipayTransactionId` VARCHAR(128) NULL,
  ADD COLUMN `sipayMaskedCard` VARCHAR(32) NULL,
  ADD COLUMN `sipayProvider` ENUM('fastpay','gpay','apay') NULL;
