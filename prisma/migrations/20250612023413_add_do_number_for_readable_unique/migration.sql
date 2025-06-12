/*
  Warnings:

  - A unique constraint covering the columns `[doNumber]` on the table `DeliveryOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `DeliveryOrder` ADD COLUMN `doNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `DeliveryOrder_doNumber_key` ON `DeliveryOrder`(`doNumber`);
