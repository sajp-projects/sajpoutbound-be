/*
  Warnings:

  - A unique constraint covering the columns `[shipmentNumber]` on the table `Shipment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Shipment` ADD COLUMN `shipmentNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Shipment_shipmentNumber_key` ON `Shipment`(`shipmentNumber`);
