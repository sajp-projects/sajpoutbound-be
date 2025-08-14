/*
  Warnings:

  - You are about to alter the column `quantity` on the `DeliveryOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - You are about to alter the column `completedQuantity` on the `DeliveryOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - You are about to alter the column `pendingQuantity` on the `DeliveryOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - You are about to alter the column `processingQuantity` on the `DeliveryOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - You are about to alter the column `requestedQuantity` on the `ShipmentItem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `DeliveryOrderItem` MODIFY `quantity` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `completedQuantity` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `pendingQuantity` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `processingQuantity` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ShipmentItem` MODIFY `requestedQuantity` DOUBLE NOT NULL DEFAULT 0;
