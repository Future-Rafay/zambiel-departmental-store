-- Expand the copied restaurant schema into the Zambiel retail domain.
-- Legacy restaurant tables remain temporarily so application callers can be
-- migrated before a later contract migration removes them.

ALTER TABLE `sitesettings`
  ALTER COLUMN `displayName` SET DEFAULT 'Zambiel',
  ALTER COLUMN `slug` SET DEFAULT 'zambiel',
  ALTER COLUMN `primaryColor` SET DEFAULT '#153B35',
  ALTER COLUMN `secondaryColor` SET DEFAULT '#D6A84B';

ALTER TABLE `fulfillmentsettings`
  ADD COLUMN `reservationMinutes` INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN `lowStockDefault` INTEGER NOT NULL DEFAULT 5;

ALTER TABLE `category`
  ADD COLUMN `parentId` VARCHAR(191) NULL,
  ADD COLUMN `imageKey` VARCHAR(512) NULL,
  ADD COLUMN `seoTitleDe` VARCHAR(180) NULL,
  ADD COLUMN `seoTitleEn` VARCHAR(180) NULL,
  ADD COLUMN `seoDescriptionDe` TEXT NULL,
  ADD COLUMN `seoDescriptionEn` TEXT NULL,
  ADD INDEX `Category_parentId_deletedAt_active_sortOrder_idx` (`parentId`, `deletedAt`, `active`, `sortOrder`),
  ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `product`
  ADD COLUMN `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `seoTitleDe` VARCHAR(180) NULL,
  ADD COLUMN `seoTitleEn` VARCHAR(180) NULL,
  ADD COLUMN `seoDescriptionDe` TEXT NULL,
  ADD COLUMN `seoDescriptionEn` TEXT NULL,
  ADD COLUMN `sourceHandle` VARCHAR(180) NULL,
  ADD COLUMN `sourceImportHash` CHAR(64) NULL,
  ADD COLUMN `sourceMetadata` JSON NULL,
  ADD COLUMN `publishedAt` DATETIME(3) NULL,
  ADD UNIQUE INDEX `Product_sourceHandle_key` (`sourceHandle`),
  ADD INDEX `Product_status_featured_publishedAt_idx` (`status`, `featured`, `publishedAt`);

-- Existing published restaurant products remain visible only until the new
-- retail storefront is deployed; imported products are always DRAFT.
UPDATE `product` SET `status` = IF(`active` = true AND `deletedAt` IS NULL, 'ACTIVE', 'ARCHIVED'), `publishedAt` = IF(`active` = true AND `deletedAt` IS NULL, `createdAt`, NULL);

ALTER TABLE `productvariant`
  ADD COLUMN `compareAtPriceRappen` INTEGER NULL,
  ADD COLUMN `barcode` VARCHAR(120) NULL,
  ADD COLUMN `weightGrams` INTEGER NULL,
  ADD COLUMN `stockOnHand` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `stockReserved` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lowStockThreshold` INTEGER NULL,
  ADD COLUMN `trackInventory` BOOLEAN NOT NULL DEFAULT true,
  ADD INDEX `ProductVariant_inventory_idx` (`trackInventory`, `stockOnHand`, `stockReserved`);

ALTER TABLE `order`
  MODIFY COLUMN `status` ENUM('PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PAYMENT_PENDING';

ALTER TABLE `orderstatusevent`
  MODIFY COLUMN `fromStatus` ENUM('PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'COMPLETED', 'CANCELLED') NULL,
  MODIFY COLUMN `toStatus` ENUM('PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'COMPLETED', 'CANCELLED') NOT NULL;

ALTER TABLE `customeraddress`
  DROP INDEX `CustomerAddress_userId_isDefault_idx`,
  ADD UNIQUE INDEX `CustomerAddress_userId_key` (`userId`);

CREATE TABLE `producttag` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(140) NOT NULL,
  UNIQUE INDEX `ProductTag_slug_key` (`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_ProductToProductTag` (
  `A` VARCHAR(191) NOT NULL,
  `B` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `_ProductToProductTag_AB_unique` (`A`, `B`),
  INDEX `_ProductToProductTag_B_index` (`B`),
  CONSTRAINT `_ProductToProductTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `_ProductToProductTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `producttag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `productoption` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `ProductOption_productId_name_key` (`productId`, `name`),
  INDEX `ProductOption_productId_sortOrder_idx` (`productId`, `sortOrder`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ProductOption_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `productoptionvalue` (
  `id` VARCHAR(191) NOT NULL,
  `optionId` VARCHAR(191) NOT NULL,
  `value` VARCHAR(160) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `ProductOptionValue_optionId_value_key` (`optionId`, `value`),
  INDEX `ProductOptionValue_optionId_sortOrder_idx` (`optionId`, `sortOrder`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ProductOptionValue_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `productoption` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `productvariantoptionvalue` (
  `variantId` VARCHAR(191) NOT NULL,
  `optionValueId` VARCHAR(191) NOT NULL,
  INDEX `ProductVariantOptionValue_optionValueId_idx` (`optionValueId`),
  PRIMARY KEY (`variantId`, `optionValueId`),
  CONSTRAINT `ProductVariantOptionValue_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `productvariant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductVariantOptionValue_optionValueId_fkey` FOREIGN KEY (`optionValueId`) REFERENCES `productoptionvalue` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `productmedia` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `variantId` VARCHAR(191) NULL,
  `objectKey` VARCHAR(2048) NOT NULL,
  `sourceUrl` VARCHAR(2048) NULL,
  `contentHash` CHAR(64) NULL,
  `altDe` VARCHAR(240) NULL,
  `altEn` VARCHAR(240) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  INDEX `ProductMedia_productId_sortOrder_idx` (`productId`, `sortOrder`),
  INDEX `ProductMedia_variantId_idx` (`variantId`),
  INDEX `ProductMedia_contentHash_idx` (`contentHash`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ProductMedia_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductMedia_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `productvariant` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventorymovement` (
  `id` VARCHAR(191) NOT NULL,
  `variantId` VARCHAR(191) NOT NULL,
  `orderId` BIGINT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `type` ENUM('OPENING_STOCK', 'MANUAL_ADJUSTMENT', 'ORDER_RESERVED', 'ORDER_RELEASED', 'ORDER_SOLD', 'ORDER_RESTORED') NOT NULL,
  `quantityChange` INTEGER NOT NULL,
  `reason` VARCHAR(300) NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `InventoryMovement_idempotencyKey_key` (`idempotencyKey`),
  INDEX `InventoryMovement_variantId_createdAt_idx` (`variantId`, `createdAt`),
  INDEX `InventoryMovement_orderId_idx` (`orderId`),
  INDEX `InventoryMovement_actorUserId_idx` (`actorUserId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `InventoryMovement_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `productvariant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `InventoryMovement_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `InventoryMovement_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
