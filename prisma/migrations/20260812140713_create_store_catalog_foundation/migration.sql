-- CreateTable
CREATE TABLE `stores` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `logo` VARCHAR(2048) NULL,
    `website` VARCHAR(2048) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `stores_slug_key`(`slug`),
    INDEX `stores_active_name_idx`(`is_active`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add the relation as nullable so existing products can be backfilled safely.
ALTER TABLE `products` ADD COLUMN `store_id` CHAR(36) NULL;

-- Preserve existing products under a deterministic transitional Store.
INSERT INTO `stores` (
    `id`,
    `name`,
    `slug`,
    `description`,
    `is_active`
)
SELECT
    '00000000-0000-4000-8000-000000000019',
    'Legacy Store',
    'legacy-store',
    'Automatically created while introducing required product stores.',
    true
WHERE EXISTS (
    SELECT 1
    FROM `products`
    LIMIT 1
);

UPDATE `products`
SET `store_id` = '00000000-0000-4000-8000-000000000019'
WHERE `store_id` IS NULL;

-- Enforce the canonical required product-to-store relationship.
ALTER TABLE `products` MODIFY `store_id` CHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `products_store_status_idx` ON `products`(`store_id`, `status`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
