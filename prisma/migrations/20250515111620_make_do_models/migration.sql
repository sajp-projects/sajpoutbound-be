-- AlterTable
ALTER TABLE `ArmadaLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA', 'DELIVERY_ORDER') NOT NULL;

-- AlterTable
ALTER TABLE `CustomerLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA', 'DELIVERY_ORDER') NOT NULL;

-- AlterTable
ALTER TABLE `ProductLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA', 'DELIVERY_ORDER') NOT NULL;

-- AlterTable
ALTER TABLE `UserLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA', 'DELIVERY_ORDER') NOT NULL;

-- AlterTable
ALTER TABLE `WarehouseLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA', 'DELIVERY_ORDER') NOT NULL;

-- CreateTable
CREATE TABLE `DeliveryOrder` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `internalNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DeliveryOrder_customerId_fkey`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `deliveryOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DeliveryOrderItem_deliveryOrderId_fkey`(`deliveryOrderId`),
    INDEX `DeliveryOrderItem_productId_fkey`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryOrderLog` (
    `id` VARCHAR(191) NOT NULL,
    `deliveryOrderId` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL,
    `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA', 'DELIVERY_ORDER') NOT NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `description` VARCHAR(191) NULL,

    INDEX `DeliveryOrderLog_performedById_fkey`(`performedById`),
    INDEX `DeliveryOrderLog_deliveryOrderId_fkey`(`deliveryOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryOrder` ADD CONSTRAINT `DeliveryOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryOrderItem` ADD CONSTRAINT `DeliveryOrderItem_deliveryOrderId_fkey` FOREIGN KEY (`deliveryOrderId`) REFERENCES `DeliveryOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryOrderItem` ADD CONSTRAINT `DeliveryOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryOrderLog` ADD CONSTRAINT `DeliveryOrderLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryOrderLog` ADD CONSTRAINT `DeliveryOrderLog_deliveryOrderId_fkey` FOREIGN KEY (`deliveryOrderId`) REFERENCES `DeliveryOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
