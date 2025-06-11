/*
  Warnings:

  - Made the column `expiresAt` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `refreshToken` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `User` MODIFY `expiresAt` DATETIME(3) NOT NULL,
    MODIFY `refreshToken` VARCHAR(191) NOT NULL;
