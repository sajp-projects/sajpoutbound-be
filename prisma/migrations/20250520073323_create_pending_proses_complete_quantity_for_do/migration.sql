-- AlterTable
ALTER TABLE `DeliveryOrderItem` ADD COLUMN `completedQuantity` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pendingQuantity` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `processingQuantity` INTEGER NOT NULL DEFAULT 0,
    MODIFY `quantity` INTEGER NOT NULL DEFAULT 0;
