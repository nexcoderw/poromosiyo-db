/*
  Warnings:

  - A unique constraint covering the columns `[user_id,provider]` on the table `auth_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `auth_accounts` MODIFY `provider_account_id` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `auth_accounts_user_provider_key` ON `auth_accounts`(`user_id`, `provider`);
