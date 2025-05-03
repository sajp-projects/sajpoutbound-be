/*
  Warnings:

  - Made the column `warehouseId` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Product` DROP FOREIGN KEY `Product_warehouseId_fkey`;

-- AlterTable
ALTER TABLE `Product` MODIFY `warehouseId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
