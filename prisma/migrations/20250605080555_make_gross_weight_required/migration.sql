/*
  Warnings:

  - Made the column `grossWeight` on table `ShipmentChosenProductWeighing` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ShipmentChosenProductWeighing` MODIFY `grossWeight` DOUBLE NOT NULL;
