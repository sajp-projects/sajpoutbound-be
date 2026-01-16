-- DropForeignKey
ALTER TABLE `Shipment` DROP FOREIGN KEY `Shipment_driverId_fkey`;

-- AlterTable
ALTER TABLE `Shipment` MODIFY `driverId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
