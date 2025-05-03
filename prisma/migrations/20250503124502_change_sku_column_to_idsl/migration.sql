/*
  Warnings:

  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_sl]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_sl` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Product_sku_key` ON `Product`;

-- AlterTable
ALTER TABLE `Product` DROP COLUMN `sku`,
    ADD COLUMN `id_sl` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Product_id_sl_key` ON `Product`(`id_sl`);
