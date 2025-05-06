/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Warehouse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Permission` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `Product` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `ProductLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER') NOT NULL;

-- AlterTable
ALTER TABLE `Role` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `UserLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER') NOT NULL;

-- AlterTable
ALTER TABLE `Warehouse` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `WarehouseLog` MODIFY `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER') NOT NULL;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `id_sl` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_name_key`(`name`),
    UNIQUE INDEX `Customer_id_sl_key`(`id_sl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerLog` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL,
    `entityType` ENUM('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER') NOT NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `description` VARCHAR(191) NULL,

    INDEX `CustomerLog_performedById_fkey`(`performedById`),
    INDEX `CustomerLog_customerId_fkey`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerLog` ADD CONSTRAINT `CustomerLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerLog` ADD CONSTRAINT `CustomerLog_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
