-- AlterTable
ALTER TABLE `User` ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `refreshToken` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ShipmentChosenProduct` ADD CONSTRAINT `ShipmentChosenProduct_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
