-- AlterTable
ALTER TABLE `SPMB` ADD COLUMN `displayCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SPMB_displayCode_key` ON `SPMB`(`displayCode`);
