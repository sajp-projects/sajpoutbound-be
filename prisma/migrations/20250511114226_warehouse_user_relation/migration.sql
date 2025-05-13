-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_warehouseId_fkey`;

-- DropIndex
DROP INDEX `User_warehouseId_key` ON `User`;

-- CreateIndex
CREATE INDEX `User_warehouseId_fkey` ON `User`(`warehouseId`);
