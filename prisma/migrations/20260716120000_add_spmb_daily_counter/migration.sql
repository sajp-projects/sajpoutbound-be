-- CreateTable
CREATE TABLE `SpmbDailyCounter` (
    `warehouseCode` VARCHAR(191) NOT NULL,
    `dateKey` VARCHAR(191) NOT NULL,
    `seq` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`warehouseCode`, `dateKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
