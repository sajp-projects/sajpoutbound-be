-- DropForeignKey
ALTER TABLE `WarehouseLog` DROP FOREIGN KEY `WarehouseLog_warehouseId_fkey`;

-- AddForeignKey
ALTER TABLE `WarehouseLog` ADD CONSTRAINT `WarehouseLog_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
