-- Create new unique constraint
ALTER TABLE `ShipmentChosenProduct` ADD CONSTRAINT `unique_shipment_do_product` UNIQUE (`shipmentId`, `deliveryOrderId`, `productId`);