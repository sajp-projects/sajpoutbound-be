-- DropForeignKey
ALTER TABLE `WarehouseLog` DROP FOREIGN KEY `WarehouseLog_warehouseId_fkey`;

-- AlterTable
ALTER TABLE `WarehouseLog` MODIFY `warehouseId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `WarehouseLog` ADD CONSTRAINT `WarehouseLog_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
