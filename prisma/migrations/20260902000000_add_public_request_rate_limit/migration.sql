CREATE TABLE `publicrequestratelimit` (
  `key` VARCHAR(80) NOT NULL,
  `count` INTEGER NOT NULL DEFAULT 0,
  `windowStartedAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`key`),
  INDEX `PublicRequestRateLimit_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
