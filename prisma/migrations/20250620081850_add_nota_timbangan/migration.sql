-- AlterTable
ALTER TABLE `ShipmentChosenProductWeighing` ADD COLUMN `timeIn` DATETIME(3) NULL,
    ADD COLUMN `timeOut` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `NotaTimbangan` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(191) NOT NULL,
    `documentPath` VARCHAR(191) NOT NULL,
    `shipmentChosenProductWeighingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotaTimbangan_ticketNumber_key`(`ticketNumber`),
    UNIQUE INDEX `NotaTimbangan_shipmentChosenProductWeighingId_key`(`shipmentChosenProductWeighingId`),
    INDEX `NotaTimbangan_shipmentChosenProductWeighingId_fkey`(`shipmentChosenProductWeighingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotaTimbangan` ADD CONSTRAINT `NotaTimbangan_shipmentChosenProductWeighingId_fkey` FOREIGN KEY (`shipmentChosenProductWeighingId`) REFERENCES `ShipmentChosenProductWeighing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
