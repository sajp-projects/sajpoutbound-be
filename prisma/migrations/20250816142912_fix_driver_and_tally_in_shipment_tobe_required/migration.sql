/*
  Warnings:

  - Made the column `driverId` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tally` on table `Shipment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Shipment` DROP FOREIGN KEY `Shipment_driverId_fkey`;

-- AlterTable
ALTER TABLE `Shipment` MODIFY `driverId` VARCHAR(191) NOT NULL,
    MODIFY `tally` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
