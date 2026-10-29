ALTER TABLE `user` ADD COLUMN `marketingOptOutAt` DATETIME(3) NULL;

CREATE TABLE `marketingcampaign` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `locale` ENUM('DE', 'EN') NOT NULL DEFAULT 'DE',
  `html` MEDIUMTEXT NOT NULL,
  `status` ENUM('DRAFT', 'SENDING', 'SENT', 'SCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `scheduledAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `MarketingCampaign_status_updatedAt_idx` (`status`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `marketingcampaignrecipient` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `email` VARCHAR(320) NOT NULL,
  `name` VARCHAR(160) NULL,
  `status` ENUM('PENDING', 'SENT', 'SCHEDULED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `providerMessageId` VARCHAR(120) NULL,
  `error` VARCHAR(500) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `MarketingCampaignRecipient_campaignId_email_key` (`campaignId`, `email`),
  INDEX `MarketingCampaignRecipient_campaignId_status_idx` (`campaignId`, `status`),
  INDEX `MarketingCampaignRecipient_userId_idx` (`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `marketingcampaignrecipient` ADD CONSTRAINT `MarketingCampaignRecipient_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `marketingcampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `marketingcampaignrecipient` ADD CONSTRAINT `MarketingCampaignRecipient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
