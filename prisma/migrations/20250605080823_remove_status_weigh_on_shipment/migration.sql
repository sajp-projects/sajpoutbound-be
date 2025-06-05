/*
  Warnings:

  - The values [WEIGHING] on the enum `ShipmentItem_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `ShipmentItem` MODIFY `status` ENUM('PENDING', 'COMPLETED') NOT NULL DEFAULT 'PENDING';
