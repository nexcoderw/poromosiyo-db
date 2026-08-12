/*
  Warnings:

  - Made the column `expires_at` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `products` MODIFY `expires_at` DATETIME(6) NOT NULL;

-- Enforce that every offer expires after the product record was created.
ALTER TABLE `products`
ADD CONSTRAINT `products_expiration_after_created_chk`
CHECK (`expires_at` > `created_at`);
