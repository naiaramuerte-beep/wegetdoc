-- Structured ledger of every Sipay charge attempt (intro + monthly MIT-R).
-- Powers the admin billing tab without JSON-parsing webhook_events.payload.
CREATE TABLE `charges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `provider` ENUM('fastpay','gpay','apay','mit') NOT NULL,
  `amountCents` INT NOT NULL,
  `refundedCents` INT NOT NULL DEFAULT 0,
  `currency` VARCHAR(8) NOT NULL DEFAULT 'EUR',
  `sipayTransactionId` VARCHAR(128) NULL,
  `sipayOrder` VARCHAR(128) NULL,
  `sipayMaskedCard` VARCHAR(32) NULL,
  `status` ENUM('ok','failed','refunded') NOT NULL DEFAULT 'ok',
  `errorDetail` VARCHAR(512) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_charges_userId` (`userId`),
  INDEX `idx_charges_createdAt` (`createdAt`),
  INDEX `idx_charges_status` (`status`),
  INDEX `idx_charges_txnId` (`sipayTransactionId`)
);
