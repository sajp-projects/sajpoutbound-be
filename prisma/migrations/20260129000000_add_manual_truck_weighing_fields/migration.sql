-- AlterTable
ALTER TABLE `Shipment` ADD COLUMN `isPostWeighingManual` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isPreWeighingManual` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `postWeighingManualReason` VARCHAR(191) NULL,
    ADD COLUMN `preWeighingManualReason` VARCHAR(191) NULL;
