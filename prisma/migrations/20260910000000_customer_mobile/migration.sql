-- Preserve existing addresses; remove only the one-address constraint after adding its replacement index.
CREATE INDEX `CustomerAddress_userId_isDefault_idx` ON `customeraddress`(`userId`, `isDefault`);
DROP INDEX `CustomerAddress_userId_key` ON `customeraddress`;
CREATE TABLE `customermobilesession` (
 `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL, `tokenHash` CHAR(64) NOT NULL,
 `expiresAt` DATETIME(3) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`), UNIQUE INDEX `customermobilesession_tokenHash_key` (`tokenHash`), INDEX `customermobilesession_userId_idx` (`userId`), INDEX `customermobilesession_expiresAt_idx` (`expiresAt`),
 CONSTRAINT `customermobilesession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `customerwishlist` (
 `userId` VARCHAR(191) NOT NULL, `productId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`userId`,`productId`), INDEX `customerwishlist_productId_idx` (`productId`),
 CONSTRAINT `customerwishlist_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `customerwishlist_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `customerdeletionrequest` (
 `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL, `reason` VARCHAR(1000) NULL, `status` VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `resolvedAt` DATETIME(3) NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `customerdeletionrequest_userId_key` (`userId`), INDEX `customerdeletionrequest_status_createdAt_idx` (`status`,`createdAt`),
 CONSTRAINT `customerdeletionrequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `customerpushsubscription` (
 `id` VARCHAR(191) NOT NULL, `token` VARCHAR(255) NOT NULL, `scopeKey` VARCHAR(255) NOT NULL, `userId` VARCHAR(191) NULL, `orderId` BIGINT NULL,
 `locale` ENUM('DE','EN') NOT NULL DEFAULT 'DE', `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `customerpushsubscription_scopeKey_key` (`scopeKey`), INDEX `customerpushsubscription_token_idx` (`token`), INDEX `customerpushsubscription_userId_idx` (`userId`), INDEX `customerpushsubscription_orderId_idx` (`orderId`),
 CONSTRAINT `customerpushsubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `customerpushsubscription_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `notificationdelivery` ADD COLUMN `nextAttemptAt` DATETIME(3) NULL, ADD COLUMN `receiptCheckedAt` DATETIME(3) NULL;
