-- AlterTable
ALTER TABLE `User` MODIFY `expiresAt` DATETIME(3) NULL,
    MODIFY `refreshToken` VARCHAR(191) NULL;
