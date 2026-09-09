-- Add destination-country configuration without assigning old postal zones.
ALTER TABLE `deliveryzone` ADD COLUMN `countryCode` CHAR(2) NULL;
CREATE UNIQUE INDEX `DeliveryZone_countryCode_key` ON `deliveryzone`(`countryCode`);

-- Postal codes remain readable on historical addresses but are no longer required.
ALTER TABLE `customeraddress` MODIFY `postalCode` VARCHAR(16) NULL;
ALTER TABLE `orderaddress` MODIFY `postalCode` VARCHAR(16) NULL;
