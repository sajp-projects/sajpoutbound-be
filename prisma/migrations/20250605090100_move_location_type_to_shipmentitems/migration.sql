/*
  Warnings:

  - You are about to drop the column `locationType` on the `Shipment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Shipment` DROP COLUMN `locationType`;

-- AlterTable
ALTER TABLE `ShipmentItem` ADD COLUMN `locationType` VARCHAR(191) NULL;
