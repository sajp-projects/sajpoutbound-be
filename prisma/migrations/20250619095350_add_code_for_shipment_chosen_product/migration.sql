/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `ShipmentChosenProduct` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `ShipmentChosenProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ShipmentChosenProduct` ADD COLUMN `code` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ShipmentChosenProduct_code_key` ON `ShipmentChosenProduct`(`code`);
