-- AlterTable
ALTER TABLE `ShipmentChosenProduct` ADD COLUMN `weighingMethod` ENUM('MANUAL', 'VENDOR') NOT NULL DEFAULT 'MANUAL';
