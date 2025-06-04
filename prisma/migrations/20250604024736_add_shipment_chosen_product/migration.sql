-- CreateTable
CREATE TABLE `ShipmentChosenProduct` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `deliveryOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShipmentChosenProduct_shipmentId_fkey`(`shipmentId`),
    INDEX `ShipmentChosenProduct_deliveryOrderId_fkey`(`deliveryOrderId`),
    INDEX `ShipmentChosenProduct_productId_fkey`(`productId`),
    UNIQUE INDEX `ShipmentChosenProduct_shipmentId_productId_key`(`shipmentId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ShipmentChosenProduct` ADD CONSTRAINT `ShipmentChosenProduct_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentChosenProduct` ADD CONSTRAINT `ShipmentChosenProduct_deliveryOrderId_fkey` FOREIGN KEY (`deliveryOrderId`) REFERENCES `DeliveryOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentChosenProduct` ADD CONSTRAINT `ShipmentChosenProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
