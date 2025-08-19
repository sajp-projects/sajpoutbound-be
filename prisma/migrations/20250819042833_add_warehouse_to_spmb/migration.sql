/*
  Warnings:

  - A unique constraint covering the columns `[shipmentId,deliveryOrderId,warehouseId]` on the table `SPMB` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `warehouseId` to the `SPMB` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `SPMB` ADD COLUMN `warehouseId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `SPMB_warehouseId_fkey` ON `SPMB`(`warehouseId`);

-- CreateIndex
CREATE UNIQUE INDEX `SPMB_shipmentId_deliveryOrderId_warehouseId_key` ON `SPMB`(`shipmentId`, `deliveryOrderId`, `warehouseId`);

-- AddForeignKey
ALTER TABLE `SPMB` ADD CONSTRAINT `SPMB_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
