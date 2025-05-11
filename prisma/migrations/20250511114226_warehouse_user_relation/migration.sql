-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_warehouseId_fkey`;

-- DropIndex
DROP INDEX `User_warehouseId_key` ON `User`;

-- CreateIndex
CREATE INDEX `User_warehouseId_fkey` ON `User`(`warehouseId`);

-- AddForeignKey
ALTER TABLE `ProductLog` ADD CONSTRAINT `ProductLog_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
