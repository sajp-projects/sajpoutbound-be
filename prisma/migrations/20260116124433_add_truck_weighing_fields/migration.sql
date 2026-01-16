-- AlterTable
ALTER TABLE `Shipment` ADD COLUMN `preWeighingWeight` DOUBLE NULL,
    ADD COLUMN `preWeighingAt` DATETIME(3) NULL,
    ADD COLUMN `preWeighingById` VARCHAR(191) NULL,
    ADD COLUMN `postWeighingWeight` DOUBLE NULL,
    ADD COLUMN `postWeighingAt` DATETIME(3) NULL,
    ADD COLUMN `postWeighingById` VARCHAR(191) NULL;
