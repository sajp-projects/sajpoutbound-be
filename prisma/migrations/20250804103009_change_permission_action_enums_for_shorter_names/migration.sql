/*
  Warnings:

  - The values [CHANGE_CUSTOMER_AFTER_WEIGH,REVISE_DO_AFTER_WEIGH] on the enum `Permission_action` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Permission` MODIFY `action` ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'WEIGH', 'VERIFY_PLATE', 'CHANGE_CUSTOMER', 'REVISE_DO') NOT NULL;
