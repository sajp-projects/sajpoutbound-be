-- AlterTable
ALTER TABLE `CustomerLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA') NOT NULL;

-- AlterTable
ALTER TABLE `ProductLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA') NOT NULL;

-- AlterTable
ALTER TABLE `UserLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA') NOT NULL;

-- AlterTable
ALTER TABLE `WarehouseLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA') NOT NULL;

-- CreateTable
CREATE TABLE `Armada` (
    `id` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `id_sl` VARCHAR(191) NULL,
    `plateNumber` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Armada_id_sl_key`(`id_sl`),
    UNIQUE INDEX `Armada_plateNumber_key`(`plateNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArmadaLog` (
    `id` VARCHAR(191) NOT NULL,
    `armadaId` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL,
    `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA') NOT NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `description` VARCHAR(191) NULL,

    INDEX `ArmadaLog_performedById_fkey`(`performedById`),
    INDEX `ArmadaLog_armadaId_fkey`(`armadaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ArmadaLog` ADD CONSTRAINT `ArmadaLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArmadaLog` ADD CONSTRAINT `ArmadaLog_armadaId_fkey` FOREIGN KEY (`armadaId`) REFERENCES `Armada`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
