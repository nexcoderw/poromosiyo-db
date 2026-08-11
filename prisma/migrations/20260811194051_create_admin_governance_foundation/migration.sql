-- AlterTable
ALTER TABLE `users` ADD COLUMN `blocked_at` DATETIME(6) NULL,
    ADD COLUMN `blocked_by_user_id` CHAR(36) NULL,
    ADD COLUMN `blocked_reason` VARCHAR(500) NULL,
    MODIFY `role` ENUM('CUSTOMER', 'ADMIN', 'SUPERADMIN') NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE `user_activities` (
    `id` CHAR(36) NOT NULL,
    `subject_user_id` CHAR(36) NULL,
    `actor_user_id` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource_type` VARCHAR(64) NULL,
    `resource_id` CHAR(36) NULL,
    `description` VARCHAR(500) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `user_activities_subject_created_idx`(`subject_user_id`, `created_at`),
    INDEX `user_activities_actor_created_idx`(`actor_user_id`, `created_at`),
    INDEX `user_activities_action_created_idx`(`action`, `created_at`),
    INDEX `user_activities_resource_created_idx`(`resource_type`, `resource_id`, `created_at`),
    INDEX `user_activities_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_blocked_at_idx` ON `users`(`blocked_at`);

-- CreateIndex
CREATE INDEX `users_blocked_by_user_id_idx` ON `users`(`blocked_by_user_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_blocked_by_user_id_fkey` FOREIGN KEY (`blocked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activities` ADD CONSTRAINT `user_activities_subject_user_id_fkey` FOREIGN KEY (`subject_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activities` ADD CONSTRAINT `user_activities_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
