/*
  Warnings:

  - You are about to drop the column `deliveryOrderId` on the `ShipmentChosenProduct` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shipmentId,productId]` on the table `ShipmentChosenProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `ShipmentChosenProduct` DROP FOREIGN KEY `ShipmentChosenProduct_deliveryOrderId_fkey`;

-- DropForeignKey
ALTER TABLE `ShipmentChosenProduct` DROP FOREIGN KEY `ShipmentChosenProduct_shipmentId_fkey`;

-- DropIndex
DROP INDEX `ShipmentChosenProduct_deliveryOrderId_fkey` ON `ShipmentChosenProduct`;

-- DropIndex
DROP INDEX `ShipmentChosenProduct_shipmentId_deliveryOrderId_productId_key` ON `ShipmentChosenProduct`;

-- DropIndex
DROP INDEX `unique_shipment_do_product` ON `ShipmentChosenProduct`;

-- AlterTable
ALTER TABLE `ShipmentChosenProduct` DROP COLUMN `deliveryOrderId`;

-- CreateIndex
CREATE UNIQUE INDEX `ShipmentChosenProduct_shipmentId_productId_key` ON `ShipmentChosenProduct`(`shipmentId`, `productId`);
