-- AlterTable
ALTER TABLE `Shipment` ADD COLUMN `postWeighingAt` DATETIME(3) NULL,
    ADD COLUMN `postWeighingById` VARCHAR(191) NULL,
    ADD COLUMN `postWeighingWeight` DECIMAL(10, 2) NULL,
    ADD COLUMN `preWeighingAt` DATETIME(3) NULL,
    ADD COLUMN `preWeighingById` VARCHAR(191) NULL,
    ADD COLUMN `preWeighingWeight` DECIMAL(10, 2) NULL;
