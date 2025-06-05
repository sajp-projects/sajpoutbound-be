-- RenameIndex
ALTER TABLE `ShipmentChosenProduct` RENAME INDEX `unique_shipment_do_product` TO `ShipmentChosenProduct_shipmentId_deliveryOrderId_productId_key`;
