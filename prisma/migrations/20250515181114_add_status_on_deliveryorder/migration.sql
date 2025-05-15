/*
  Warnings:

  - Added the required column `status` to the `DeliveryOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `DeliveryOrder` ADD COLUMN `status` ENUM('PENDING', 'PROSES', 'SELESAI') NOT NULL;
