-- AlterTable
ALTER TABLE `products` ADD COLUMN `expires_at` DATETIME(6) NULL;

-- CreateIndex
CREATE INDEX `products_status_expires_idx` ON `products`(`status`, `expires_at`);
