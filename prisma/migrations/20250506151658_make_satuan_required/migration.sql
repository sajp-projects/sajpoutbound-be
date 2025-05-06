/*
  Warnings:

  - Made the column `satuan` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Product` MODIFY `satuan` VARCHAR(191) NOT NULL;
