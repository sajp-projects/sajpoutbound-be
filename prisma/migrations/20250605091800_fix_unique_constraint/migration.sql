-- Drop old constraint if it exists (using a safer approach)
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'ShipmentChosenProduct'
    AND index_name = 'ShipmentChosenProduct_shipmentId_productId_key'
);

SET @drop_statement = IF(@constraint_exists > 0,
  'ALTER TABLE `ShipmentChosenProduct` DROP INDEX `ShipmentChosenProduct_shipmentId_productId_key`',
  'SELECT 1');

PREPARE stmt FROM @drop_statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make sure the new constraint is in place (first check if it already exists)
SET @new_constraint_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'ShipmentChosenProduct'
    AND index_name = 'unique_shipment_do_product'
);

SET @add_statement = IF(@new_constraint_exists = 0,
  'ALTER TABLE `ShipmentChosenProduct` ADD CONSTRAINT `unique_shipment_do_product` UNIQUE (`shipmentId`, `deliveryOrderId`, `productId`)',
  'SELECT 1');

PREPARE stmt FROM @add_statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;