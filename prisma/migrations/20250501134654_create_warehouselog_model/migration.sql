-- AlterTable
ALTER TABLE `UserLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE') NOT NULL;

-- CreateTable
CREATE TABLE `WarehouseLog` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL,
    `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE') NOT NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `description` VARCHAR(191) NULL,

    INDEX `WarehouseLog_performedById_fkey`(`performedById`),
    INDEX `WarehouseLog_warehouseId_fkey`(`warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WarehouseLog` ADD CONSTRAINT `WarehouseLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarehouseLog` ADD CONSTRAINT `WarehouseLog_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
