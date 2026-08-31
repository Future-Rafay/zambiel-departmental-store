-- Convert historical restaurant statuses before narrowing the retail contract.
UPDATE `order`
SET `status` = 'PROCESSING'
WHERE `status` = 'PREPARING';

UPDATE `order`
SET `status` = CASE
  WHEN `fulfillmentType` = 'PICKUP' THEN 'PICKED_UP'
  ELSE 'DELIVERED'
END
WHERE `status` = 'COMPLETED';

UPDATE `orderstatusevent`
SET `fromStatus` = 'PROCESSING'
WHERE `fromStatus` = 'PREPARING';

UPDATE `orderstatusevent`
SET `toStatus` = 'PROCESSING'
WHERE `toStatus` = 'PREPARING';

UPDATE `orderstatusevent` event
INNER JOIN `order` sourceOrder ON sourceOrder.`id` = event.`orderId`
SET event.`fromStatus` = CASE
  WHEN sourceOrder.`fulfillmentType` = 'PICKUP' THEN 'PICKED_UP'
  ELSE 'DELIVERED'
END
WHERE event.`fromStatus` = 'COMPLETED';

UPDATE `orderstatusevent` event
INNER JOIN `order` sourceOrder ON sourceOrder.`id` = event.`orderId`
SET event.`toStatus` = CASE
  WHEN sourceOrder.`fulfillmentType` = 'PICKUP' THEN 'PICKED_UP'
  ELSE 'DELIVERED'
END
WHERE event.`toStatus` = 'COMPLETED';

-- Remove obsolete foreign keys before their scheduling and modifier tables.
ALTER TABLE `orderitemoption`
  DROP FOREIGN KEY `OrderItemOption_optionChoiceId_fkey`,
  DROP INDEX `OrderItemOption_optionChoiceId_idx`,
  DROP COLUMN `optionChoiceId`;

ALTER TABLE `order`
  DROP FOREIGN KEY `Order_slotId_fkey`,
  DROP INDEX `Order_scheduledFor_status_idx`,
  DROP INDEX `Order_slotId_status_idx`,
  DROP COLUMN `slotId`,
  DROP COLUMN `scheduledFor`,
  DROP COLUMN `estimatedReadyAt`;

DROP TABLE `productallergen`;
DROP TABLE `allergen`;
DROP TABLE `productavailabilitywindow`;
DROP TABLE `productsuggestion`;
DROP TABLE `optionchoice`;
DROP TABLE `optiongroup`;
DROP TABLE `openingwindow`;
DROP TABLE `serviceexception`;
DROP TABLE `fulfillmentslot`;

ALTER TABLE `product`
  DROP COLUMN `isHalal`,
  DROP COLUMN `isVegetarian`,
  DROP COLUMN `isVegan`,
  DROP COLUMN `spiceLevel`;

ALTER TABLE `fulfillmentsettings`
  DROP COLUMN `asapEnabled`,
  DROP COLUMN `scheduledEnabled`,
  DROP COLUMN `deliveryPrepMinutes`,
  DROP COLUMN `pickupPrepMinutes`,
  DROP COLUMN `minimumLeadMinutes`,
  DROP COLUMN `maximumAdvanceDays`,
  DROP COLUMN `slotIntervalMinutes`,
  DROP COLUMN `defaultSlotCapacity`;

ALTER TABLE `order`
  MODIFY `status` ENUM(
    'PAYMENT_PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'PICKED_UP',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PAYMENT_PENDING';

ALTER TABLE `orderstatusevent`
  MODIFY `fromStatus` ENUM(
    'PAYMENT_PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'PICKED_UP',
    'CANCELLED'
  ) NULL,
  MODIFY `toStatus` ENUM(
    'PAYMENT_PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'PICKED_UP',
    'CANCELLED'
  ) NOT NULL;

-- Native database checks complement server validation at the final write boundary.
ALTER TABLE `productvariant`
  ADD CONSTRAINT `ProductVariant_stockOnHand_check` CHECK (`stockOnHand` >= 0),
  ADD CONSTRAINT `ProductVariant_stockReserved_check` CHECK (`stockReserved` >= 0 AND `stockReserved` <= `stockOnHand`),
  ADD CONSTRAINT `ProductVariant_price_check` CHECK (`priceRappen` >= 0),
  ADD CONSTRAINT `ProductVariant_compareAtPrice_check` CHECK (`compareAtPriceRappen` IS NULL OR `compareAtPriceRappen` > `priceRappen`);
