CREATE TABLE `newslettersubscriber` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `locale` ENUM('DE', 'EN') NOT NULL DEFAULT 'DE',
  `unsubscribeTokenHash` CHAR(64) NOT NULL,
  `subscribedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `unsubscribedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `NewsletterSubscriber_email_key` (`email`),
  UNIQUE INDEX `NewsletterSubscriber_unsubscribeTokenHash_key` (`unsubscribeTokenHash`),
  INDEX `NewsletterSubscriber_unsubscribedAt_subscribedAt_idx` (`unsubscribedAt`, `subscribedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
