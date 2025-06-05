-- CreateTable
CREATE TABLE `ShipmentChosenProductWeighing` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentChosenProductId` VARCHAR(191) NOT NULL,
    `grossWeight` DOUBLE NOT NULL,
    `netWeight` DOUBLE NOT NULL,
    `tareWeight` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShipmentChosenProductWeighing_shipmentChosenProductId_fkey`(`shipmentChosenProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ShipmentChosenProductWeighing` ADD CONSTRAINT `ShipmentChosenProductWeighing_shipmentChosenProductId_fkey` FOREIGN KEY (`shipmentChosenProductId`) REFERENCES `ShipmentChosenProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
