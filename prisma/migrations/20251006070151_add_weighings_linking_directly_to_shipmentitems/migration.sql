-- AlterTable
ALTER TABLE `ShipmentItem` ADD COLUMN `shipmentChosenProductWeighingId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ShipmentItem_shipmentChosenProductWeighingId_fkey` ON `ShipmentItem`(`shipmentChosenProductWeighingId`);

-- AddForeignKey
ALTER TABLE `ShipmentItem` ADD CONSTRAINT `ShipmentItem_shipmentChosenProductWeighingId_fkey` FOREIGN KEY (`shipmentChosenProductWeighingId`) REFERENCES `ShipmentChosenProductWeighing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
