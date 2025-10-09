-- AlterTable
ALTER TABLE `ShipmentItem` ADD COLUMN `loadingGroupId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ShipmentItem_loadingGroupId_idx` ON `ShipmentItem`(`loadingGroupId`);
